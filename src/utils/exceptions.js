class ValidationError extends Error {
  constructor(message) {
    super(message); // (1)
    this.name = "ValidationError"; // (2)
  }
}

class UploadError extends Error {
  constructor(message) {
    super(message); // (1)
    this.name = "UploadError"; // (2)
  }
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message); // (1)
    this.name = "HttpError"; // (2)
    this.message = `${statusCode} - ${message}`
    this.statusCode = statusCode
  }
}

class ScrapeError extends Error {
  constructor(message) {
    super(message); // (1)
    this.name = "ScrapeError"; // (2)
  }
}


module.exports = {
  ValidationError,
  UploadError,
  HttpError,
  ScrapeError
}  
