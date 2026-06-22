import React from "react";
import logoAsset from "@/assets/logo-unrobot.png.asset.json";

export const Header: React.FC = () => {
  return (
    <header className="text-center mb-12 animate-fade-in">
      <div className="inline-flex items-center gap-4 justify-center mb-6">
        <img
          src={logoAsset.url}
          alt=""
          className="h-20 w-auto"
        />
        <span className="text-5xl sm:text-6xl font-black tracking-tighter leading-none text-primary drop-shadow-sm">
          UnRobot
        </span>
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
