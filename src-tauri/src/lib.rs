use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::command;
use zip::read::ZipArchive;
use std::fs::File;
use std::io::{BufReader, Read};

/// Result of reading a document file
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentText {
    /// Original file name
    pub filename: String,
    /// Extracted plain text
    pub text: String,
    /// Word count (approximate)
    pub word_count: usize,
    /// Character count
    pub char_count: usize,
}

/// Result of batch processing multiple files
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BatchResult {
    pub documents: Vec<DocumentText>,
    pub total_files: usize,
    pub total_words: usize,
    pub errors: Vec<FileError>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileError {
    pub filename: String,
    pub error: String,
}

/// Extract text from a .docx file (ZIP archive with word/document.xml)
fn extract_docx_text(path: &std::path::Path) -> Result<String, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let mut archive = ZipArchive::new(reader).map_err(|e| e.to_string())?;

    let mut xml_content = String::new();
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        if entry.name().ends_with("word/document.xml") {
            entry.read_to_string(&mut xml_content).map_err(|e| e.to_string())?;
            break;
        }
    }

    if xml_content.is_empty() {
        return Err("No word/document.xml found in .docx".to_string());
    }

    // Parse XML and extract text between <w:t> tags
    let mut text = String::new();
    let mut in_wt = false;
    let mut current_text = String::new();

    for ch in xml_content.chars() {
        match ch {
            '<' => {
                if in_wt {
                    text.push_str(&current_text);
                    text.push(' ');
                    current_text.clear();
                }
                in_wt = false;
            }
            '>' => {
                // Check if we just closed into a <w:t> opening tag
                // Simple approach: check for <w:t or <w:t>
            }
            _ => {
                current_text.push(ch);
            }
        }
    }

    // Better approach: use quick-xml
    text.clear();
    let mut reader2 = quick_xml::Reader::from_str(&xml_content);
    let mut buf = Vec::new();
    loop {
        match reader2.read_event_into(&mut buf) {
            Ok(quick_xml::events::Event::Start(ref e)) | Ok(quick_xml::events::Event::Empty(ref e)) => {
                if e.local_name().as_ref() == b"t" {
                    // Inside <w:t> — next text event is what we want
                    if let Ok(quick_xml::events::Event::Text(ref t)) = reader2.read_event_into(&mut buf) {
                        let s = t.unescape().unwrap_or_default().into_owned();
                        text.push_str(&s);
                        text.push(' ');
                    }
                }
            }
            Ok(quick_xml::events::Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
    }

    Ok(text.trim().to_string())
}

/// Extract text from an .odt file (ZIP archive with content.xml)
fn extract_odt_text(path: &std::path::Path) -> Result<String, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let mut archive = ZipArchive::new(reader).map_err(|e| e.to_string())?;

    let mut xml_content = String::new();
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        if entry.name().ends_with("content.xml") {
            entry.read_to_string(&mut xml_content).map_err(|e| e.to_string())?;
            break;
        }
    }

    if xml_content.is_empty() {
        return Err("No content.xml found in .odt".to_string());
    }

    let mut text = String::new();
    let mut reader = quick_xml::Reader::from_str(&xml_content);
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(quick_xml::events::Event::Start(ref e)) | Ok(quick_xml::events::Event::Empty(ref e)) => {
                let name = e.local_name().as_ref();
                if name == b"p" || name == b"h" || name == b"span" || name == b"line-break" {
                    if name == b"line-break" || name == b"p" || name == b"h" {
                        text.push('\n');
                    }
                }
            }
            Ok(quick_xml::events::Event::Text(ref t)) => {
                let s = t.unescape().unwrap_or_default().into_owned();
                text.push_str(&s);
            }
            Ok(quick_xml::events::Event::End(ref e)) => {
                let name = e.local_name().as_ref();
                if name == b"p" || name == b"h" {
                    text.push('\n');
                }
            }
            Ok(quick_xml::events::Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
    }

    Ok(text.trim().to_string())
}

/// Extract text from a plain text file (.txt, .md, .csv, etc.)
fn extract_plain_text(path: &std::path::Path) -> Result<String, String> {
    let mut content = String::new();
    File::open(path)
        .map_err(|e| e.to_string())?
        .read_to_string(&mut content)
        .map_err(|e| e.to_string())?;
    Ok(content)
}

/// Auto-detect file type and extract text
fn extract_text_from_file(path: &std::path::Path) -> Result<String, String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "docx" => extract_docx_text(path),
        "odt" => extract_odt_text(path),
        "txt" | "md" | "csv" | "json" | "xml" | "html" | "htm" | "log" | "rtf" | "tex" => {
            extract_plain_text(path)
        }
        _ => extract_plain_text(path), // fallback: try as plain text
    }
}

/// Read a single document and extract its text content
#[command]
pub async fn read_document(path: String) -> Result<DocumentText, String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(format!("File not found: {}", path));
    }

    let filename = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let text = extract_text_from_file(&path_buf)?;
    let word_count = text.split_whitespace().count();
    let char_count = text.chars().count();

    Ok(DocumentText {
        filename,
        text,
        word_count,
        char_count,
    })
}

/// Batch read multiple documents from a list of file paths
#[command]
pub async fn batch_read_documents(paths: Vec<String>) -> Result<BatchResult, String> {
    let mut documents = Vec::new();
    let mut errors = Vec::new();
    let mut total_words = 0;

    for path in paths {
        let path_buf = PathBuf::from(&path);
        let filename = path_buf
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        match extract_text_from_file(&path_buf) {
            Ok(text) => {
                let word_count = text.split_whitespace().count();
                total_words += word_count;
                documents.push(DocumentText {
                    filename: filename.clone(),
                    text,
                    word_count,
                    char_count: 0,
                });
            }
            Err(e) => {
                errors.push(FileError {
                    filename,
                    error: e,
                });
            }
        }
    }

    Ok(BatchResult {
        total_files: documents.len() + errors.len(),
        total_words,
        documents,
        errors,
    })
}

/// List all supported files in a directory (recursive)
#[command]
pub async fn scan_directory(path: String) -> Result<Vec<String>, String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let supported_extensions = [
        "txt", "md", "csv", "docx", "odt", "json", "xml", "html", "htm", "rtf", "tex", "log",
    ];

    let mut files = Vec::new();
    walk_dir(&dir, &supported_extensions, &mut files)
        .map_err(|e| e.to_string())?;

    Ok(files)
}

fn walk_dir(
    dir: &std::path::Path,
    extensions: &[&str],
    files: &mut Vec<String>,
) -> std::io::Result<()> {
    if dir.is_dir() {
        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                walk_dir(&path, extensions, files)?;
            } else if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if extensions.contains(&ext.to_lowercase().as_str()) {
                    if let Some(p) = path.to_str() {
                        files.push(p.to_string());
                    }
                }
            }
        }
    }
    Ok(())
}

/// Save text to a file
#[command]
pub async fn save_document(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            read_document,
            batch_read_documents,
            scan_directory,
            save_document,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}