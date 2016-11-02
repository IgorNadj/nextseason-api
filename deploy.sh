zip -rq  /tmp/nextseason-lambda.zip ./ -x *.git*
aws s3 cp /tmp/nextseason-lambda.zip s3://nextseason/lambda-zips/
