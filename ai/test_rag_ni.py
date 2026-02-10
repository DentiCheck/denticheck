from src.denticheck_ai.pipelines.rag.service import RagService
import os

def test_rag():
    print("Testing RagService...")
    try:
        service = RagService()
        question = "사랑니 발치 후 주의사항이 뭐야?"
        print(f"Question: {question}")
        answer = service.ask(question)
        print(f"Answer: {answer}")
    except Exception as e:
        print(f"Error testing RagService: {e}")

if __name__ == "__main__":
    test_rag()
