#!/usr/bin/env bash
# =============================================================================
# LocalStack Init Script - Phase 3 - Week 11
# =============================================================================

set -euo pipefail

REGION="us-east-1"
ENDPOINT="http://localhost:4566"
TMPDIR=$(mktemp -d)

echo "============================================================"
echo " CreatorFlow - LocalStack Init"
echo "============================================================"

# 1. SNS topic
echo "[1/6] Creating SNS topic: creatorflow-events"
TOPIC_ARN=$(awslocal sns create-topic \
  --name creatorflow-events \
  --region "$REGION" \
  --query TopicArn \
  --output text)
echo "      ARN: $TOPIC_ARN"

# 2. DLQ
echo "[2/6] Creating DLQ: content-dispatcher-dlq"
DLQ_URL=$(awslocal sqs create-queue \
  --queue-name content-dispatcher-dlq \
  --region "$REGION" \
  --query QueueUrl \
  --output text)
DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query Attributes.QueueArn \
  --output text)
echo "      URL: $DLQ_URL"
echo "      ARN: $DLQ_ARN"

# 3. content-scheduler-queue
echo "[3/6] Creating SQS queue: content-scheduler-queue"
SCHEDULER_QUEUE_URL=$(awslocal sqs create-queue \
  --queue-name content-scheduler-queue \
  --region "$REGION" \
  --query QueueUrl \
  --output text)
SCHEDULER_QUEUE_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "$SCHEDULER_QUEUE_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query Attributes.QueueArn \
  --output text)
echo "      URL: $SCHEDULER_QUEUE_URL"

# 4. post-dispatcher-queue + redrive via JSON file (avoids CLI quoting issues)
echo "[4/6] Creating SQS queue: post-dispatcher-queue (with DLQ redrive policy)"
DISPATCHER_QUEUE_URL=$(awslocal sqs create-queue \
  --queue-name post-dispatcher-queue \
  --region "$REGION" \
  --query QueueUrl \
  --output text)
echo "      URL: $DISPATCHER_QUEUE_URL"

# Write redrive policy to a temp file - no shell quoting involved
cat > "$TMPDIR/redrive.json" << JSONEOF
{
  "RedrivePolicy": "{\"deadLetterTargetArn\":\"$DLQ_ARN\",\"maxReceiveCount\":\"3\"}"
}
JSONEOF

awslocal sqs set-queue-attributes \
  --queue-url "$DISPATCHER_QUEUE_URL" \
  --attributes "file://$TMPDIR/redrive.json" \
  --region "$REGION"
echo "      Redrive policy set -> content-dispatcher-dlq (maxReceiveCount=3)"

DISPATCHER_QUEUE_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "$DISPATCHER_QUEUE_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query Attributes.QueueArn \
  --output text)

# 5. analytics-queue
echo "[5/6] Creating SQS queue: analytics-queue"
ANALYTICS_QUEUE_URL=$(awslocal sqs create-queue \
  --queue-name analytics-queue \
  --region "$REGION" \
  --query QueueUrl \
  --output text)
ANALYTICS_QUEUE_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "$ANALYTICS_QUEUE_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query Attributes.QueueArn \
  --output text)
echo "      URL: $ANALYTICS_QUEUE_URL"

# 6. Subscribe all 3 queues to SNS topic
echo "[6/6] Subscribing SQS queues to SNS topic: creatorflow-events"
awslocal sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$SCHEDULER_QUEUE_ARN" \
  --region "$REGION" --output text > /dev/null
echo "      content-scheduler-queue subscribed"

awslocal sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$DISPATCHER_QUEUE_ARN" \
  --region "$REGION" --output text > /dev/null
echo "      post-dispatcher-queue subscribed"

awslocal sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$ANALYTICS_QUEUE_ARN" \
  --region "$REGION" --output text > /dev/null
echo "      analytics-queue subscribed"

rm -rf "$TMPDIR"

echo ""
echo "============================================================"
echo " LocalStack Init Complete"
echo "============================================================"
echo " SNS topic : $TOPIC_ARN"
echo " Queues    : content-scheduler-queue"
echo "             post-dispatcher-queue (DLQ -> content-dispatcher-dlq)"
echo "             analytics-queue"
echo "             content-dispatcher-dlq"
echo ""
echo " Verify:"
echo "   aws --endpoint-url=$ENDPOINT sns list-topics"
echo "   aws --endpoint-url=$ENDPOINT sqs list-queues"
echo "============================================================"
