"""
Resume parsing: extract text and convert pages to base64 images.
Supports PDF and DOCX. Returns both for dual-input LLM evaluation.
"""
import base64
import io
import json
import os
import tempfile
from pathlib import Path
from typing import Optional

import pdfplumber
from pdf2image import convert_from_path
from docx import Document
from PIL import Image


def extract_text_from_pdf(file_path: str) -> str:
    """Extract and normalize text from a PDF file."""
    lines = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                lines.append(text.strip())
    return "\n\n".join(lines)


def extract_text_from_docx(file_path: str) -> str:
    """Extract and normalize text from a DOCX file."""
    doc = Document(file_path)
    lines = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            lines.append(text)
    return "\n".join(lines)


def pdf_to_images(file_path: str, output_dir: str, max_pages: int = 3) -> list[str]:
    """
    Convert PDF pages to PNG images, save to output_dir.
    Returns list of saved image file paths.
    Limit to max_pages to keep LLM payload manageable.
    """
    images = convert_from_path(file_path, dpi=150, first_page=1, last_page=max_pages)
    saved_paths = []
    base_name = Path(file_path).stem
    for i, img in enumerate(images):
        out_path = os.path.join(output_dir, f"{base_name}_page_{i + 1}.png")
        img.save(out_path, "PNG")
        saved_paths.append(out_path)
    return saved_paths


def docx_to_images(file_path: str, output_dir: str) -> list[str]:
    """
    Convert DOCX to images via LibreOffice headless → PDF → images.
    Falls back to empty list if LibreOffice is not available.
    """
    import subprocess
    try:
        result = subprocess.run(
            ["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", output_dir, file_path],
            capture_output=True, timeout=30
        )
        if result.returncode != 0:
            return []
        pdf_path = os.path.join(output_dir, Path(file_path).stem + ".pdf")
        if not os.path.exists(pdf_path):
            return []
        return pdf_to_images(pdf_path, output_dir)
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return []


def images_to_base64(image_paths: list[str]) -> list[str]:
    """Convert image files to base64 strings for LLM vision input."""
    result = []
    for path in image_paths:
        with open(path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
            result.append(encoded)
    return result


def parse_resume(file_path: str, source_type: str, upload_dir: str) -> dict:
    """
    Main entry point. Returns:
    {
        "text": str,
        "image_paths": [str, ...],
        "image_base64": [str, ...]  # for LLM
    }
    """
    if source_type == "pdf":
        text = extract_text_from_pdf(file_path)
        image_paths = pdf_to_images(file_path, upload_dir)
    elif source_type == "docx":
        text = extract_text_from_docx(file_path)
        image_paths = docx_to_images(file_path, upload_dir)
    else:
        text = ""
        image_paths = []

    image_base64 = images_to_base64(image_paths)

    return {
        "text": text,
        "image_paths": image_paths,
        "image_base64": image_base64,
    }
