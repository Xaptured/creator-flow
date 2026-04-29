package com.creatorflow.media_service.exception;

public class MediaAlreadyUploadedException extends RuntimeException {

    public MediaAlreadyUploadedException(String fileName) {
        super("File '" + fileName + "' has already been uploaded successfully. Delete it first to re-upload.");
    }
}
