#!/usr/bin/env python3
import json
from pathlib import Path

def main():
    root = Path(__file__).resolve().parent.parent.parent
    manifests_dir = root / "data" / "manifests"
    
    print(f"Scanning manifests in: {manifests_dir}")
    if not manifests_dir.exists():
        print("Error: manifests directory does not exist.")
        return
        
    count = 0
    modified_files = 0
    
    for json_file in manifests_dir.glob("*.json"):
        try:
            content = json_file.read_text(encoding="utf-8")
            data = json.loads(content)
            
            modified = False
            if "pages" in data:
                for page in data["pages"]:
                    if "image" in page and isinstance(page["image"], str):
                        original = page["image"]
                        if original.startswith("/assets/pages/"):
                            # Replace /assets/pages/ with /books/
                            page["image"] = original.replace("/assets/pages/", "/books/", 1)
                            modified = True
                            count += 1
            
            if modified:
                # Write back with nice formatting
                json_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
                modified_files += 1
                
        except Exception as e:
            print(f"Error processing {json_file.name}: {e}")
            
    print(f"Completed. Updated {count} image paths across {modified_files} files.")

if __name__ == "__main__":
    main()
