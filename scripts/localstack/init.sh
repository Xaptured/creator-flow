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

# 1. SNS topic: creatorflow-events (scheduler-service publishes CONTENT_READY_TO_PUBLISH here)
echo "[1/6] Creating SNS topic: creatorflow-events"
TOPIC_ARN=$($AWS sns create-topic \
  --name creatorflow-events \
  --region "$REGION" \
  --query TopicArn \
  --output text)
echo "      ARN: $TOPIC_ARN"

# 2. SNS topic: content-published (media-service publishes CONTENT_PUBLISHED/CONTENT_FAILED here)
echo "[2/6] Creating SNS topic: content-published"
CONTENT_PUBLISHED_TOPIC_ARN=$($AWS sns create-topic \
  --name content-published \
  --region "$REGION" \
  --query TopicArn \
  --output text)
echo "      ARN: $CONTENT_PUBLISHED_TOPIC_ARN"

# 3. DLQ for post-dispatcher-queue
echo "[3/6] Creating DLQ: content-dispatcher-dlq"
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

# 4. post-dispatcher-queue + redrive (media-service: PublishDispatcherListener consumes CONTENT_READY_TO_PUBLISH)
echo "[4/6] Creating SQS queue: post-dispatcher-queue (with DLQ redrive policy)"
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

# 5. analytics-queue (analytics-service: AnalyticsQueueListener consumes CONTENT_PUBLISHED)
echo "[5/6] Creating SQS queue: analytics-queue"
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

# 6a. analytics-events SNS topic (analytics-service publishes; ai-service consumes)
echo "[6a] Creating SNS topic: analytics-events"
ANALYTICS_EVENTS_TOPIC_ARN=$($AWS sns create-topic \
  --name analytics-events \
  --region "$REGION" \
  --query TopicArn \
  --output text)
echo "      ARN: $ANALYTICS_EVENTS_TOPIC_ARN"

# 6b. ai-processing-queue (ai-service consumes analytics.updated events)
echo "[6b] Creating SQS queue: ai-processing-queue"
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

# 7. Subscribe queues to SNS topics
echo "[7/7] Subscribing SQS queues to SNS topics"

# creatorflow-events → post-dispatcher-queue (media-service publishes content to platforms)
$AWS sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$DISPATCHER_QUEUE_ARN" \
  --region "$REGION" --output text > /dev/null
echo "      creatorflow-events -> post-dispatcher-queue"

# content-published → analytics-queue (analytics-service schedules metric fetch jobs)
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
echo " Queues     : post-dispatcher-queue    (media-service, DLQ -> content-dispatcher-dlq, maxReceive=3)"
echo "              analytics-queue          (analytics-service)"
echo "              content-dispatcher-dlq   (DLQ)"
echo "              ai-processing-queue      (ai-service — analytics.updated consumer)"
echo ""
echo " Subscriptions:"
echo "   creatorflow-events -> post-dispatcher-queue"
echo "   content-published  -> analytics-queue"
echo "   analytics-events   -> ai-processing-queue"
echo ""
echo " Verify:"
echo "   aws --endpoint-url=$ENDPOINT --region $REGION sns list-topics"
echo "   aws --endpoint-url=$ENDPOINT --region $REGION sqs list-queues"
echo "============================================================"
