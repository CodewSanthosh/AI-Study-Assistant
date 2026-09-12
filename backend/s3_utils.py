import os
import boto3
from botocore.exceptions import ClientError
import uuid

# Read from environment variables
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

def get_s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        region_name=AWS_REGION
    )

def upload_file_to_s3(file_obj, filename: str) -> str:
    """
    Uploads a file object to AWS S3.
    If AWS credentials are not set, it saves the file locally for development.
    Returns the generated unique file key.
    """
    unique_filename = f"{uuid.uuid4()}_{filename}"
    
    if not AWS_ACCESS_KEY or not S3_BUCKET_NAME:
        print("AWS keys not set. Saving file locally to /backend/uploads/")
        os.makedirs("uploads", exist_ok=True)
        local_path = os.path.join("uploads", unique_filename)
        with open(local_path, "wb") as f:
            f.write(file_obj.read())
        return local_path

    s3_client = get_s3_client()
    try:
        s3_client.upload_fileobj(
            file_obj,
            S3_BUCKET_NAME,
            unique_filename,
            ExtraArgs={'ContentType': 'application/pdf'} # Defaulting to PDF for study docs, can be dynamic
        )
        return unique_filename
    except ClientError as e:
        print(f"Error uploading to S3: {e}")
        raise e
