#!/usr/bin/env bash
# =============================================================================
# LocalStack Init Script - Phase 3 - Week 11 (updated Week 15)
# =============================================================================

set -euo pipefail

REGION="ap-south-1"
ENDPOINT="http://localhost:4566"
# Use 'aws --endpoint-url' directly — works on all platforms (Windows/Mac/Linux)
# without needing the awscli-local package (awslocal).
AWS="aws --endpoint-url=$ENDPOINT"

echo "============================================================"
echo " CreatorFlow - LocalStack Init"
echo "============================================================"

# 1. SNS topic: creatorflow-events (fan-out — scheduler-service publishes here)
echo "[1/8] Creating SNS topic: creatorflow-events"
TOPIC_ARN=$($AWS sns create-topic \
  --name creatorflow-events \
  --region "$REGION" \
  --query TopicArn \
  --output text)
echo "      ARN: $TOPIC_ARN"

# 2. SNS topic: content-published (media-service publishes CONTENT_PUBLISHED/FAILED here)
echo "[2/8] Creating SNS topic: content-published"
CONTENT_PUBLISHED_TOPIC_ARN=$($AWS sns create-topic \
  --name content-published \
  --region "$REGION" \
  --query TopicArn \
  --output text)
echo "      ARN: $CONTENT_PUBLISHED_TOPIC_ARN"

# 3. DLQ
echo "[3/8] Creating DLQ: content-dispatcher-dlq"
DLQ_URL=$($AWS sqs create-queue \
  --queue-name content-dispatcher-dlq \
  --region "$REGION" \
  --query QueueUrl \
  --output text)
DLQ_ARN=$($AWS sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query Attributes.QueueArn \
  --output text)
echo "      URL: $DLQ_URL"
echo "      ARN: $DLQ_ARN"

# 4. content-scheduler-queue (scheduler-service: SqsMessageListener — logging/debug only)
echo "[4/8] Creating SQS queue: content-scheduler-queue"
SCHEDULER_QUEUE_URL=$($AWS sqs create-queue \
  --queue-name content-scheduler-queue \
  --region "$REGION" \
  --query QueueUrl \
  --output text)
SCHEDULER_QUEUE_ARN=$($AWS sqs get-queue-attributes \
  --queue-url "$SCHEDULER_QUEUE_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query Attributes.QueueArn \
  --output text)
echo "      URL: $SCHEDULER_QUEUE_URL"

# 5. post-dispatcher-queue + redrive (media-service: PublishDispatcherListener consumes)
echo "[5/8] Creating SQS queue: post-dispatcher-queue (with DLQ redrive policy)"
DISPATCHER_QUEUE_URL=$($AWS sqs create-queue \
  --queue-name post-dispatcher-queue \
  --region "$REGION" \
  --query QueueUrl \
  --output text)
echo "      URL: $DISPATCHER_QUEUE_URL"

$AWS sqs set-queue-attributes \
  --queue-url "$DISPATCHER_QUEUE_URL" \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
  --region "$REGION"
echo "      Redrive policy set -> content-dispatcher-dlq (maxReceiveCount=3)"

DISPATCHER_QUEUE_ARN=$($AWS sqs get-queue-attributes \
  --queue-url "$DISPATCHER_QUEUE_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query Attributes.QueueArn \
  --output text)

# 6. analytics-queue (analytics-service consumes CONTENT_PUBLISHED/FAILED)
echo "[6/8] Creating SQS queue: analytics-queue"
ANALYTICS_QUEUE_URL=$($AWS sqs create-queue \
  --queue-name analytics-queue \
  --region "$REGION" \
  --query QueueUrl \
  --output text)
ANALYTICS_QUEUE_ARN=$($AWS sqs get-queue-attributes \
  --queue-url "$ANALYTICS_QUEUE_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query Attributes.QueueArn \
  --output text)
echo "      URL: $ANALYTICS_QUEUE_URL"

# 7. content-status-queue (scheduler-service: ContentStatusListener — updates content row to PUBLISHED/FAILED)
echo "[7/8] Creating SQS queue: content-status-queue"
CONTENT_STATUS_QUEUE_URL=$($AWS sqs create-queue \
  --queue-name content-status-queue \
  --region "$REGION" \
  --query QueueUrl \
  --output text)
CONTENT_STATUS_QUEUE_ARN=$($AWS sqs get-queue-attributes \
  --queue-url "$CONTENT_STATUS_QUEUE_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query Attributes.QueueArn \
  --output text)
echo "      URL: $CONTENT_STATUS_QUEUE_URL"

# 8a. analytics-events SNS topic (analytics-service publishes; ai-service consumes)
echo "[8a] Creating SNS topic: analytics-events"
ANALYTICS_EVENTS_TOPIC_ARN=$($AWS sns create-topic \
  --name analytics-events \
  --region "$REGION" \
  --query TopicArn \
  --output text)
echo "      ARN: $ANALYTICS_EVENTS_TOPIC_ARN"

# 8b. ai-processing-queue (ai-service consumes analytics.updated events)
echo "[8b] Creating SQS queue: ai-processing-queue"
AI_PROCESSING_QUEUE_URL=$($AWS sqs create-queue \
  --queue-name ai-processing-queue \
  --region "$REGION" \
  --query QueueUrl \
  --output text)
AI_PROCESSING_QUEUE_ARN=$($AWS sqs get-queue-attributes \
  --queue-url "$AI_PROCESSING_QUEUE_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query Attributes.QueueArn \
  --output text)
echo "      URL: $AI_PROCESSING_QUEUE_URL"
echo "      ARN: $AI_PROCESSING_QUEUE_ARN"

# 9. Subscribe queues to SNS topics
echo "[9/9] Subscribing SQS queues to SNS topics"

# creatorflow-events → post-dispatcher-queue (media-service publishes to platforms)
#                   → content-scheduler-queue (debug/logging)
#                   → analytics-queue (analytics fan-out)
$AWS sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$DISPATCHER_QUEUE_ARN" \
  --region "$REGION" --output text > /dev/null
echo "      creatorflow-events -> post-dispatcher-queue"

$AWS sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$SCHEDULER_QUEUE_ARN" \
  --region "$REGION" --output text > /dev/null
echo "      creatorflow-events -> content-scheduler-queue"

$AWS sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$ANALYTICS_QUEUE_ARN" \
  --region "$REGION" --output text > /dev/null
echo "      creatorflow-events -> analytics-queue"

# content-published → content-status-queue (scheduler-service updates content row status)
#                  → analytics-queue (analytics records publish outcome)
$AWS sns subscribe \
  --topic-arn "$CONTENT_PUBLISHED_TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$CONTENT_STATUS_QUEUE_ARN" \
  --region "$REGION" --output text > /dev/null
echo "      content-published  -> content-status-queue"

$AWS sns subscribe \
  --topic-arn "$CONTENT_PUBLISHED_TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$ANALYTICS_QUEUE_ARN" \
  --region "$REGION" --output text > /dev/null
echo "      content-published  -> analytics-queue"

# analytics-events → ai-processing-queue (ai-service triggers embedding generation)
$AWS sns subscribe \
  --topic-arn "$ANALYTICS_EVENTS_TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$AI_PROCESSING_QUEUE_ARN" \
  --region "$REGION" --output text > /dev/null
echo "      analytics-events   -> ai-processing-queue"

echo ""
echo "============================================================"
echo " LocalStack Init Complete"
echo "============================================================"
echo " SNS topics : creatorflow-events  -> $TOPIC_ARN"
echo "              content-published   -> $CONTENT_PUBLISHED_TOPIC_ARN"
echo "              analytics-events    -> $ANALYTICS_EVENTS_TOPIC_ARN"
echo ""
echo " Queues     : content-scheduler-queue  (debug fan-out)"
echo "              post-dispatcher-queue    (media-service, DLQ -> content-dispatcher-dlq, maxReceive=3)"
echo "              analytics-queue          (analytics-service)"
echo "              content-status-queue     (scheduler-service status updater)"
echo "              content-dispatcher-dlq   (DLQ)"
echo "              ai-processing-queue      (ai-service — analytics.updated consumer)"
echo ""
echo " Subscriptions:"
echo "   creatorflow-events -> post-dispatcher-queue, content-scheduler-queue, analytics-queue"
echo "   content-published  -> content-status-queue, analytics-queue"
echo "   analytics-events   -> ai-processing-queue"
echo ""
echo " Verify:"
echo "   aws --endpoint-url=$ENDPOINT --region $REGION sns list-topics"
echo "   aws --endpoint-url=$ENDPOINT --region $REGION sqs list-queues"
echo "============================================================"
