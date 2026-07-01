import React from "react";
import { Dialog, DialogHeader, DialogBody } from "@/components/ui/dialog";

interface TransferLearningHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferLearningHelp({ open, onOpenChange }: TransferLearningHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader
        title="Transfer Learning — Guide d'utilisation"
        onClose={() => onOpenChange(false)}
      >
        Entraînez un modèle de détection IA personnalisé directement dans votre navigateur.
      </DialogHeader>

      <DialogBody>
        {/* Section : Qu'est-ce que c'est ? */}
        <Section title="Qu'est-ce que le Transfer Learning ?">
          <p>
            Le Transfer Learning permet d'entraîner un <strong>modèle de détection IA personnalisé</strong> directement
            dans votre navigateur. Contrairement au modèle intégré qui utilise des règles générales, votre modèle
            personnalisé apprend à partir de <strong>vos propres exemples</strong> de textes humains et de textes
            générés par IA, ce qui améliore significativement la précision pour votre domaine spécifique.
          </p>
          <ul className="mt-2 space-y-1">
            <li><Bullet /> 100 % côté client — aucun texte n'est envoyé sur un serveur</li>
            <li><Bullet /> Entraînement instantané (moins de 5 secondes pour 200 échantillons)</li>
            <li><Bullet /> Modèle sauvegardé localement (IndexedDB)</li>
            <li><Bullet /> Réseau de neurones 38 → 32 → 16 → 1, optimiseur Adam</li>
          </ul>
        </Section>

        {/* Section : Préparer le dataset */}
        <Section title="Étape 1 — Préparer votre dataset">
          <p>Le dataset est un ensemble de textes étiquetés « Humain » ou « IA ».</p>

          <SubSection title="Exigences minimales">
            <TableGrid rows={[
              ["Texte minimum par échantillon", "50 caractères"],
              ["Échantillons IA minimum", "2"],
              ["Échantillons humains minimum", "2"],
              ["Total minimum", "4 échantillons"],
            ]} />
          </SubSection>

          <SubSection title="Recommandations pour un bon modèle">
            <ul className="space-y-1">
              <li><Bullet /><strong>10 à 50 échantillons</strong> par classe (IA et humain)</li>
              <li><Bullet />Variez les sources IA : ChatGPT, Claude, Gemini, Mistral, etc.</li>
              <li><Bullet />Variez les textes humains : différents auteurs, styles et longueurs</li>
              <li><Bullet />Privilégiez des textes de <strong>200 à 1 000 caractères</strong></li>
              <li><Bullet />Évitez les textes trop courts ou trop similaires entre eux</li>
            </ul>
          </SubSection>

          <SubSection title="Ajouter un échantillon manuellement">
            <ol className="list-decimal list-inside space-y-1">
              <li>Collez ou saisissez un texte dans la zone de texte (min. 50 caractères)</li>
              <li>Sélectionnez l'étiquette avec le commutateur :
                <span className="inline-flex gap-2 ml-1">
                  <Tag color="green">Humain</Tag>
                  <Tag color="red">IA</Tag>
                </span>
              </li>
              <li>Cliquez sur <Kbd>Ajouter</Kbd></li>
            </ol>
          </SubSection>

          <SubSection title="Importer / Exporter un dataset JSON">
            <p>
              Cliquez sur <Kbd>Importer JSON</Kbd> pour charger un fichier au format :
            </p>
            <CodeBlock>{`[
  { "text": "Votre texte humain...", "label": "human" },
  { "text": "Votre texte IA...", "label": "ai" }
]`}</CodeBlock>
            <p className="mt-2">
              Cliquez sur <Kbd>Exporter dataset</Kbd> pour sauvegarder ou partager votre dataset.
            </p>
          </SubSection>
        </Section>

        {/* Section : Configurer l'entraînement */}
        <Section title="Étape 2 — Configurer l'entraînement">
          <p>Choisissez le nombre d'<strong>époques</strong> (passes complètes sur le dataset) :</p>
          <TableGrid
            header={["Option", "Époques", "Cas d'usage"]}
            rows={[
              ["Rapide", "10", "Test rapide, proof of concept"],
              ["Recommandé", "30", "Bon équilibre vitesse / précision"],
              ["Précis", "50", "Dataset volumineux (> 30 échantillons)"],
              ["Exhaustif", "100", "Dataset très volumineux (> 50 échantillons)"],
            ]}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Les autres hyperparamètres (taux d'apprentissage : 0,001 — split de validation : 20 %) sont préréglés.
          </p>
        </Section>

        {/* Section : Lancer l'entraînement */}
        <Section title="Étape 3 — Lancer l'entraînement">
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Vérifiez : au moins <strong>2 IA + 2 humains</strong></li>
            <li>Cliquez sur <Kbd>Entraîner</Kbd></li>
            <li>Suivez la barre de progression :
              <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5 text-xs">
                <li><strong>Époque</strong> en cours (ex : 15/30)</li>
                <li><strong>Loss</strong> (erreur — plus elle baisse, mieux c'est)</li>
                <li><strong>Précision de validation</strong> (pourcentage de bonnes prédictions)</li>
              </ul>
            </li>
            <li>Un message affiche la précision finale (ex : « Précision : 87 % »)</li>
            <li>Le modèle est <strong>automatiquement sauvegardé et activé</strong></li>
          </ol>
        </Section>

        {/* Section : Utiliser le modèle */}
        <Section title="Étape 4 — Utiliser votre modèle personnalisé">
          <p>
            Une fois activé, votre modèle est utilisé automatiquement par le détecteur IA. Le score affiché
            combine les <strong>heuristiques AWPA (40 %)</strong> et votre <strong>modèle ML (60 %)</strong>.
          </p>
          <p>
            Un indicateur vert « Modèle personnalisé » avec la précision apparaît en haut du panneau.
            Le modèle reste actif après rechargement de la page.
          </p>
        </Section>

        {/* Section : Gestion des modèles */}
        <Section title="Gestion des modèles sauvegardés">
          <p>Cliquez sur « Modèles sauvegardés » en bas du panneau :</p>
          <TableGrid
            header={["Action", "Description"]}
            rows={[
              ["▶ Activer", "Charge le modèle pour les analyses futures"],
              ["✕ Supprimer", "Supprime définitivement le modèle du navigateur"],
              ["✓ Modèle actif", "Coché en vert, bordure bleue"],
            ]}
          />
          <p className="mt-2">
            Vous pouvez entraîner <strong>plusieurs modèles</strong> et basculer entre eux (par exemple :
            un pour l'académique, un autre pour les articles de blog).
          </p>
        </Section>

        {/* Section : Technique */}
        <Section title="Que se passe-t-il techniquement ?">
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>Extraction de features</strong> — chaque texte est analysé par le moteur AWPA (38 dimensions)</li>
            <li><strong>Entraînement</strong> — un réseau de neurones pur JavaScript apprend à distinguer les patterns</li>
            <li><strong>Inférence</strong> — le texte passe par l'extracteur puis par votre modèle entraîné</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            Aucune dépendance externe : pas de TensorFlow.js, pas de PyTorch, pas d'appel API.
          </p>
        </Section>

        {/* Section : Dépannage */}
        <Section title="Dépannage">
          <TableGrid
            header={["Problème", "Solution"]}
            rows={[
              ["« Le texte doit faire au moins 50 caractères »", "Ajoutez plus de contenu"],
              ["« Minimum 2 IA + 2 humains requis »", "Ajoutez au moins 2 textes de chaque classe"],
              ["La précision est faible (< 60 %)", "Ajoutez plus d'échantillons variés, vérifiez l'étiquetage"],
              ["Le modèle ne semble pas utilisé", "Vérifiez qu'il est activé (coche verte)"],
              ["Les modèles ont disparu", "IndexedDB est vidé si vous effacez les données du site — exportez vos datasets"],
            ]}
          />
        </Section>
      </DialogBody>
    </Dialog>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ml-1">
      <h4 className="text-sm font-medium text-foreground/80 mb-1">{title}</h4>
      <div>{children}</div>
    </div>
  );
}

function Bullet() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70 mt-1.5 mr-2 shrink-0" />;
}

function Tag({ color, children }: { color: "green" | "red"; children: React.ReactNode }) {
  const cls = color === "green"
    ? "bg-success/15 text-success border-success/30"
    : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded border ${cls}`}>
      {children}
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-accent border border-border text-foreground">
      {children}
    </kbd>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 p-3 rounded-md bg-background border border-border text-xs font-mono overflow-x-auto text-muted-foreground">
      {children}
    </pre>
  );
}

function TableGrid({
  header,
  rows,
}: {
  header?: string[];
  rows: string[][];
}) {
  return (
    <div className="rounded-md border border-border overflow-hidden mt-2">
      <table className="w-full text-xs">
        {header && (
          <thead>
            <tr className="bg-accent/50">
              {header.map((h, i) => (
                <th key={i} className="text-left px-3 py-2 font-medium text-foreground/70 border-b border-border">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border/60 hover:bg-accent/20">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? "font-medium text-foreground/80" : "text-muted-foreground"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}