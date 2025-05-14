def detect_language(code):
    """
    Detects the programming language of the given code.
    Returns a string representing the detected language.
    """
    code = code.strip()
   
    # Check for common language patterns
   
    # Python detection
    python_indicators = [
        "def ",
        "import ",
        "from ",
        "print(",
        "class ",
        "if __name__ == '__main__':",
        "for ",
        "while ",
        "elif ",
        "else:",
        "__init__"
    ]
    python_count = sum(1 for indicator in python_indicators if indicator in code)
   
    # Java detection
    java_indicators = [
        "public class",
        "public static void main",
        "System.out.println",
        "import java.",
        "extends ",
        "implements "
    ]
    java_count = sum(1 for indicator in java_indicators if indicator in code)
   
    # C++ detection
    cpp_indicators = [
        "#include <",
        "cout <<",
        "cin >>",
        "using namespace std",
        "vector<",
        "int main()"
    ]
    cpp_count = sum(1 for indicator in cpp_indicators if indicator in code)
   
    # JavaScript detection
    js_indicators = [
        "function ",
        "const ",
        "let ",
        "var ",
        "console.log",
        "document.getElementById",
        "=>"
    ]
    js_count = sum(1 for indicator in js_indicators if indicator in code)
   
    # SQL detection (case insensitive)
    code_upper = code.upper()
    sql_indicators = [
        "SELECT ",
        "FROM ",
        "WHERE ",
        "INSERT INTO",
        "UPDATE ",
        "DELETE FROM",
        "CREATE TABLE",
        "ALTER TABLE"
    ]
    sql_count = sum(1 for indicator in sql_indicators if indicator in code_upper)
   
    # Check file format indicators
    if code.strip().startswith("<?php"):
        return "PHP"
    elif "<html" in code.lower() or "<!doctype html" in code.lower():
        return "HTML"
   
    # Determine language based on indicator counts
    counts = {
        "Python": python_count,
        "Java": java_count,
        "C++": cpp_count,
        "JavaScript": js_count,
        "SQL": sql_count
    }

    max_count = max(counts.values())
    if max_count > 0:
        # If there's a tie, choose based on priority
        max_languages = [lang for lang, count in counts.items() if count == max_count]
        if len(max_languages) == 1:
            return max_languages[0]
        else:
            # Priority order if there's a tie
            priority = ["Python", "JavaScript", "Java", "C++", "SQL"]
            for lang in priority:
                if lang in max_languages:
                    return lang
   
    # If no strong indicators, make a best guess based on syntax patterns
    if ":" in code and ("#" in code or "def " in code or "import " in code):
        return "Python"
    elif "{" in code and "}" in code:
        if ";" in code:
            if "System.out" in code:
                return "Java"
            elif "console.log" in code or "function" in code or "var " in code or "let " in code:
                return "JavaScript"
            else:
                return "C++"
   
    # Fall back to default
    return "Python"  # Default to Python as fallback instead of "Unknown"