import requests
import sys
import os
import zipfile
import io

URL = "https://app.codeguide.dev/api/urls/e65d5d99-56b2-49f9-bf58-de651902b255?download=true"
DOC_DIR = "documentation"


def main():
    try:
        response = requests.get(URL)
        content_type = response.headers.get('Content-Type', '')
        
        if 'application/json' in content_type:
            data = response.json()
            message = data.get('message', '').lower()
            if 'expired' in message:
                print("The URL is expired. Please follow the instructions below:")
                print(data.get('message'))
                sys.exit(1)
            else:
                print("Received JSON that does not indicate expiration:")
                print(data)
                sys.exit(1)
        else:
            # Assume binary blob
            print("Downloading documentation...")
            zip_content = io.BytesIO(response.content)
            # Create documentation directory if it does not exist
            os.makedirs(DOC_DIR, exist_ok=True)
            # Unzip the content into the documentation folder
            with zipfile.ZipFile(zip_content) as z:
                z.extractall(DOC_DIR)
            print(f"Documentation downloaded and extracted to '{DOC_DIR}'.")
            
            plan_path = os.path.join(DOC_DIR, "implementation_plan.md")
            if os.path.exists(plan_path):
                print("Found 'implementation_plan.md'. Please follow its instructions for implementing the project.")
            else:
                print("No 'implementation_plan.md' found. Proceed with project implementation based on the other documents.")
    except Exception as e:
        print("An error occurred:", str(e))
        sys.exit(1)


if __name__ == '__main__':
    main()
