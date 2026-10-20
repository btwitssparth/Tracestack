from fastapi import FastAPI

app = FastAPI(
    title="TraceStack API",
    description="API monitoring and incident management platform",
    version="0.1.0",
)


@app.get("/")
def root():
    return {"message": "TraceStack API is running!"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}