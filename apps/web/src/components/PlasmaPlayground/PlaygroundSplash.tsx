"use client";

import { Camera, LucideIcon, Radio, Shapes, Waves } from "lucide-react";
import { useEffect, useRef } from "react";
import { SplashChoice } from "./types";

type SplashSource = Exclude<SplashChoice, null>;

type PlaygroundSplashProps = {
  de: boolean;
  onChoose: (source: SplashSource) => void;
};

type SplashTile = {
  source: SplashSource;
  icon: LucideIcon;
  title: string;
  description: string;
};

export const PlaygroundSplash = ({ de, onChoose }: PlaygroundSplashProps) => {
  const firstTileRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstTileRef.current?.focus({ preventScroll: true });
  }, []);

  const tiles: SplashTile[] = [
    {
      source: "ripples",
      icon: Radio,
      title: "Ripples",
      description: de
        ? "Ein Instrument zum Anfassen: Setze Quellen auf eine schwingende Platte, gib jeder Klang und Noten und sieh zu, wie der Sand zu deinem Loop tanzt."
        : "A playable instrument: place sources on a vibrating plate, give each a sound and notes, and watch the sand dance to your loop.",
    },
    {
      source: "camera",
      icon: Camera,
      title: de ? "Kamera" : "Camera",
      description: de
        ? "Du, live in ASCII. Das Bild bleibt auf deinem Gerät."
        : "You, live in ASCII. The video never leaves your device.",
    },
    {
      source: "shapes",
      icon: Shapes,
      title: de ? "3D-Formen" : "3D shapes",
      description: de
        ? "Drehbare Körper, mit der Maus steuerbar."
        : "Rotating solids you can orbit with the pointer.",
    },
    {
      source: "plasma",
      icon: Waves,
      title: de ? "Nur Plasma" : "Just plasma",
      description: de
        ? "Das Original. Klicken erzeugt Wellen."
        : "The original. Click to send ripples.",
    },
  ];

  return (
    <div className="playground-center">
      <section
        className="playground-card"
        aria-labelledby="playground-splash-title"
      >
        <h1 id="playground-splash-title" className="playground-card-title">
          {de ? "Womit spielen wir?" : "What should we play with?"}
        </h1>
        <p className="playground-card-text">
          {de
            ? "Wähle eine Quelle für das Plasma. Du kannst sie jederzeit wechseln."
            : "Pick a source for the plasma. You can switch any time."}
        </p>
        <div className="playground-tiles">
          {tiles.map(({ source, icon: Icon, title, description }, index) => (
            <button
              key={source}
              ref={index === 0 ? firstTileRef : undefined}
              type="button"
              className="playground-tile"
              onClick={() => onChoose(source)}
            >
              <Icon size={20} aria-hidden />
              <span className="playground-tile-title">{title}</span>
              <span className="playground-tile-text">{description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
