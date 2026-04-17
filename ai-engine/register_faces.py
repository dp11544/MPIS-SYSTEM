import os
import glob
import json
import argparse
import logging
import requests
import numpy as np

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

def get_engine():
    """Import and return the MPIS embedding engine."""
    try:
        from embedding_engine import get_engine as engine_loader
        return engine_loader()
    except ImportError:
        logging.error("Could not import embedding_engine. Ensure you are running this inside the ai-engine directory.")
        exit(1)

def register_faces(person_id: str, image_dir: str, backend_url: str):
    """
    Reads all images in the specified directory, extracts embeddings using
    the AI engine, and uploads them to the MPIS backend for the given person.
    """
    if not os.path.isdir(image_dir):
        logging.error(f"Image directory not found: {image_dir}")
        return

    # Find all images
    valid_extensions = ("*.jpg", "*.jpeg", "*.png")
    image_paths = []
    for ext in valid_extensions:
        image_paths.extend(glob.glob(os.path.join(image_dir, ext)))
        image_paths.extend(glob.glob(os.path.join(image_dir, ext.upper())))

    if not image_paths:
        logging.error(f"No valid images found in {image_dir}.")
        return

    logging.info(f"Found {len(image_paths)} images for person {person_id}. Extracting embeddings...")

    engine = get_engine()
    import cv2

    embeddings_list = []
    for path in image_paths:
        img = cv2.imread(path)
        if img is None:
            logging.warning(f"Failed to read image: {path}")
            continue

        # Extract normalized embedding
        emb = engine.get_embedding_from_image(img)
        if emb is not None:
            # Convert to list for JSON serialization
            embeddings_list.append(emb.tolist())
            logging.info(f"Successfully extracted embedding from {os.path.basename(path)}")
        else:
            logging.warning(f"No face detected or invalid embedding structure for {os.path.basename(path)}")

    if not embeddings_list:
        logging.error("No valid embeddings could be extracted from any of the images.")
        return

    logging.info(f"Uploading {len(embeddings_list)} embeddings to the backend...")

    # Build the PUT request
    url = f"{backend_url}/api/persons/{person_id}/embeddings"
    payload = {
        "embeddings": embeddings_list
    }

    try:
        response = requests.put(url, json=payload)
        response.raise_for_status()
        logging.info("========================================")
        logging.info(f"SUCCESS: Successfully added {len(embeddings_list)} embeddings for person {person_id}!")
        logging.info("The AI Engine will automatically fetch these during the next database refresh cycle.")
        logging.info("========================================")
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to upload embeddings: {e}")
        if e.response is not None:
            logging.error(f"Backend response: {e.response.text}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MPIS Multi-Image Face Registration Tool")
    parser.add_argument("--person-id", "-p", required=True, help="Registered Person ID (from the backend MongoDB)")
    parser.add_argument("--dir", "-d", required=True, help="Directory containing images of the person")
    parser.add_argument("--backend-url", "-b", default="http://localhost:8080", help="Spring Boot Backend URL (default: http://localhost:8080)")

    args = parser.parse_args()
    register_faces(args.person_id, args.dir, args.backend_url)
