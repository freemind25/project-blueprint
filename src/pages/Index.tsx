import { TextCleaner } from "@/components/TextCleaner";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Nettoyeur de Texte - Supprimez les caractères invisibles</title>
        <meta
          name="description"
          content="Application de nettoyage de texte pour supprimer les caractères invisibles comme les espaces insécables (U+00A0) et espaces minces (U+202F). Traitement 100% local."
        />
      </Helmet>
      <TextCleaner />
    </>
  );
};

export default Index;
