"use client";

import { ImageUp } from "lucide-react";

type UploadDropZoneProps = {
  de: boolean;
  onBrowse: () => void;
};

export const UploadDropZone = ({ de, onBrowse }: UploadDropZoneProps) => (
  <div className="playground-center">
    <section className="playground-card playground-dropzone">
      <ImageUp size={28} aria-hidden className="playground-dropzone-icon" />
      <h2 className="playground-card-title">
        {de ? "Bild oder Video hier ablegen" : "Drop an image or video here"}
      </h2>
      <p className="playground-card-text">
        {de
          ? "Die Datei wird nur in deinem Browser verarbeitet."
          : "The file is processed in your browser only."}
      </p>
      <button type="button" className="playground-button" onClick={onBrowse}>
        {de ? "Datei auswählen" : "Choose a file"}
      </button>
    </section>
  </div>
);
