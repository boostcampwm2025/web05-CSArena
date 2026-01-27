# Project Context

## Overview
This project, **Backend-Interview-RAG-Pipeline**, automates the creation of verified backend interview questions. It leverages **HyperCLOVA X** (HCX-007) and **Clova Embedding v2** within a RAG (Retrieval Augmented Generation) architecture to generate questions based on existing knowledge stored in a PostgreSQL database. The quality of generated questions is verified using the **RAGAS** framework.

## Architecture & Workflow
The core pipeline in `main.py` executes the following steps:
1.  **Category Selection:** Selects a target "leaf" category from the `categories` table (`category_loader.py`).
2.  **Retrieval:**
    *   Uses **HyDE (Hypothetical Document Embedding)** to generate an optimized search query (`hyde_generator.py`).
    *   Performs vector search on `document_embeddings` (PostgreSQL with `pgvector`) via `retriever.py`.
3.  **Generation:** Generates structured interview questions (JSON format) using HCX-007 based on retrieved chunks (`question_generator.py`).
4.  **Evaluation:** Evaluates the generated questions using **RAGAS** metrics like Faithfulness and Answer Relevance (`evaluator.py`).
5.  **Storage:** Saves the final output (questions + evaluation scores) to `result.json`.

## Directory Structure
*   `main.py`: Main entry point orchestrating the full pipeline.
*   `config.py`: Central configuration (API keys, DB URLs, model parameters).
*   `db.py`: Database connection and session management.
*   `category_loader.py`: Fetches target categories (leaf nodes) for question generation.
*   `retriever.py`: Logic for retrieving relevant document chunks from the DB.
*   `hyde_generator.py`: Generates hypothetical documents to improve retrieval accuracy.
*   `question_generator.py`: Interacts with LLM to generate questions in a specific JSON schema.
*   `evaluator.py`: Implements RAGAS evaluation logic.
*   `schemas.py`: Pydantic models for data validation and structure.
*   `prompts/`: Python modules containing prompt templates for different generation tasks (system, essay, multiple_choice, etc.).
*   `experiments/`: Contains experimental scripts (e.g., `retrieval_comparison.py`) and design documents.

## Key Technologies
*   **Language:** Python 3.10+
*   **LLM:** HyperCLOVA X (HCX-007) via `langchain-naver`
*   **Embedding:** Clova Embedding v2 (`clir-emb-dolphin`)
*   **Evaluation:** `ragas` framework
*   **Database:** PostgreSQL with `pgvector` extension
*   **Dependencies:** `langchain-naver`, `psycopg2-binary`, `pgvector`, `ragas`, `pydantic`

## Setup & Execution
*   **Install Dependencies:** `pip install -r requirements.txt`
*   **Run Pipeline:** `python main.py`
*   **Environment:** Ensure `.env` is configured with `CLOVASTUDIO_API_KEY` and database connection details (refer to `.env.example`).
