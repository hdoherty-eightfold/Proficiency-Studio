import csv
import json
import sys
import os

def csv_to_json(csv_file_path, json_file_path):
    """
    Converts a CSV file to a JSON file.
    """
    data = []
    try:
        with open(csv_file_path, mode='r', encoding='utf-8') as csv_file:
            csv_reader = csv.DictReader(csv_file)
            for row in csv_reader:
                data.append(row)
        
        with open(json_file_path, mode='w', encoding='utf-8') as json_file:
            json.dump(data, json_file, indent=4)
            
        print(f"Successfully converted {csv_file_path} to {json_file_path}")
        return True
    except Exception as e:
        print(f"Error converting CSV to JSON: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python csv_to_json.py <csv_file_path> [json_file_path]")
        sys.exit(1)
        
    csv_path = sys.argv[1]
    if len(sys.argv) >= 3:
        json_path = sys.argv[2]
    else:
        json_path = os.path.splitext(csv_path)[0] + '.json'
        
    csv_to_json(csv_path, json_path)
