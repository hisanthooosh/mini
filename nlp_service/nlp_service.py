import nltk
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
import string
import numpy as np # Make sure numpy is imported

# --- Initialize Flask App ---
app = Flask(__name__)
CORS(app) # Allow requests from other origins

# --- Download NLTK stopwords (if not already downloaded) ---
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    print("Downloading nltk stopwords...")
    nltk.download('stopwords')

# --- NLP Pre-processing Function ---
def preprocess_text(text):
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    text = re.sub(r'\d+', '', text)
    stop_words = set(nltk.corpus.stopwords.words('english'))
    words = text.split()
    cleaned_words = [word for word in words if word not in stop_words]
    return ' '.join(cleaned_words)

# --- Define the API Endpoint ---
@app.route('/analyze', methods=['POST'])
def analyze_projects():
    try:
        # 1. Get the lists of titles and abstracts from the request
        data = request.get_json()
        titles = data.get('titles', [])
        abstracts = data.get('abstracts', [])

        if not titles or not abstracts or len(titles) != len(abstracts):
            return jsonify({"error": "Please provide matching lists of titles and abstracts."}), 400

        if len(titles) < 1:
             return jsonify({"error": "Please provide at least one project."}), 400

        # --- MODIFICATION: Combine Title and Abstract ---
        # We add a space in between. Adding the title gives more weight to its keywords.
        combined_texts = [f"{title} {abstract}" for title, abstract in zip(titles, abstracts)]
        # ----------------------------------------------

        # 2. Calculate Abstract Lengths (before cleaning)
        abstract_lengths = [len(abstract.split()) for abstract in abstracts] # Count words

        # 3. Clean (pre-process) each combined text
        cleaned_texts = [preprocess_text(doc) for doc in combined_texts]

        # Handle case where cleaning results in empty strings
        if not any(cleaned_texts): # Check if all strings are empty after cleaning
             if len(titles) == 1: # If only one project submitted
                  similarity_matrix = np.array([[1.0]])
                  uniqueness_score = np.array([1.0])
                  ranked_indices = np.array([0])
             else:
                  return jsonify({"error": "Text cleaning resulted in empty content for all projects. Cannot analyze."}), 400
        else:
            # 4. Convert cleaned combined text to numbers (TF-IDF Vectorization)
            vectorizer = TfidfVectorizer()
            tfidf_matrix = vectorizer.fit_transform(cleaned_texts)

            # 5. Calculate Similarity based on combined text
            similarity_matrix = cosine_similarity(tfidf_matrix)

            # 6. Calculate Uniqueness Score and Rank (based on combined text similarity)
            N = len(titles)
            if N > 1:
                # Ensure diagonal is exactly 1 before summing for average
                np.fill_diagonal(similarity_matrix, 1.0)
                avg_similarity = (np.sum(similarity_matrix, axis=1) - 1.0) / (N - 1)
                # Handle potential division by zero if N=1 somehow slips through or if a row sum is unexpectedly low
                avg_similarity = np.nan_to_num(avg_similarity) # Replace NaN with 0
            else: # N == 1
                avg_similarity = np.array([0.0]) # A single project is dissimilar to "others"

            uniqueness_score = 1.0 - avg_similarity
            # Clip scores to be within [0, 1] range just in case of float errors
            uniqueness_score = np.clip(uniqueness_score, 0.0, 1.0)

            ranked_indices = np.argsort(uniqueness_score)[::-1] # Highest score first

        # 7. Prepare Rank Data (including abstract length)
        project_ranks = []
        for i, original_index in enumerate(ranked_indices):
            project_ranks.append({
                "index": int(original_index),
                "score": float(uniqueness_score[original_index]),
                "rank": i + 1,
                "abstract_length": int(abstract_lengths[original_index]) # Add length here
            })

        # --- DEBUG PRINT (Optional: Remove in production) ---
        print("DEBUG: Similarity Matrix (Combined Text):\n", np.round(similarity_matrix, 2))
        print("DEBUG: Uniqueness Ranks (Combined Text):\n", project_ranks)
        # ---------------------------------------------

        # 8. Send the results back as JSON
        return jsonify({
            "message": "Analysis successful",
            "similarity_matrix": similarity_matrix.tolist(),
            "uniqueness_ranks": project_ranks # This now includes abstract_length
        })

    except Exception as e:
        print(f"Error in /analyze: {str(e)}") # Log the error server-side
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

# --- Run the Flask App ---
if __name__ == '__main__':
    print("Starting Python NLP service on port 5001...")
    # Use host='0.0.0.0' if running in Docker or need external access
    app.run(port=5001, debug=True)