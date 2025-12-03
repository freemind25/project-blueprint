import React from "react";
import { Sparkles } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="text-center mb-12 animate-fade-in">
      <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-accent mb-6">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      
      <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
        Nettoyeur de Texte
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        Supprimez les caractères invisibles de vos fichiers texte.
        <br />
        <span className="text-sm">
          Espaces insécables (U+00A0) et espaces minces (U+202F) issus de l'IA ou de copier-coller.
        </span>
      </p>
    </header>
  );
};
