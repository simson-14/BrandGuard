from io import BytesIO

from docx import Document as WordDocument
from fastapi import HTTPException, UploadFile


MAX_UPLOAD_BYTES = 5 * 1024 * 1024


async def extract_docx_text(upload: UploadFile) -> str:
    if not upload.filename or not upload.filename.lower().endswith(".docx"):
        raise HTTPException(status_code=415, detail="Only .docx documents are supported.")
    data = await upload.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Document exceeds the 5 MB upload limit.")
    try:
        document = WordDocument(BytesIO(data))
    except Exception as error:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid DOCX document.") from error
    text = "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
    if not text:
        raise HTTPException(status_code=400, detail="The DOCX document contains no readable text.")
    return text