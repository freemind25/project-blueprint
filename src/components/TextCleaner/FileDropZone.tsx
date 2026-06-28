import React, { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  onFileLoad: (content: string, fileName: string) => void;
  onError: (message: string) => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({ onFileLoad, onError }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".txt")) {
        onError("Seuls les fichiers .txt sont acceptés");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        onError("Le fichier ne doit pas dépasser 10 Mo");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileLoad(content, file.name);
      };
      reader.onerror = () => {
        onError("Erreur lors de la lecture du fichier");
      };
      reader.readAsText(file, "UTF-8");
    },
    [onFileLoad, onError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 border-dashed p-8 transition-all duration-300 ease-smooth",
        isDragging
          ? "border-primary bg-accent/50 scale-[1.02]"
          : "border-border bg-card hover:border-primary/50 hover:bg-accent/30"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label="Zone de dépôt de fichier texte"
    >
      <input
        type="file"
        accept=".txt"
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Sélectionner un fichier texte"
      />
      
      <div className="flex flex-col items-center gap-4 pointer-events-none">
        <div
          className={cn(
            "p-4 rounded-2xl transition-all duration-300",
            isDragging ? "bg-primary text-primary-foreground scale-110" : "bg-accent text-accent-foreground"
          )}
        >
          {isDragging ? <FileText className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">
            {isDragging ? "Déposez le fichier ici" : "Glissez-déposez votre fichier"}
          </p>
          <p className="text-sm text-muted-foreground">
            ou cliquez pour sélectionner un fichier .txt
          </p>
          <p className="text-xs text-muted-foreground/70">
            Taille maximale : 10 Mo
          </p>
        </div>
      </div>
    </div>
  );
};
