# TODO (README phase 3): repair this Dockerfile. The draft has no working
# folder, copies the code before installing the dependencies (so every code
# change reinstalls everything), and starts a dev server no other container
# can reach.
FROM python:3.14-slim
COPY ./app /app/app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
EXPOSE 8000
CMD ["fastapi", "dev", "app/main.py", "--port", "8000"]
