import type { ReactNode } from "react";
import styles from "../Services/services.module.css";

/** The numbered eyebrow and heading every section shares with the service pages. */
export function ForYouSectionHeader({
  number,
  eyebrow,
  id,
  children,
}: {
  number: number;
  eyebrow: ReactNode;
  id: string;
  children: ReactNode;
}) {
  return (
    <>
      <p className={styles.eyebrow}>
        {String(number).padStart(2, "0")} / {eyebrow}
      </p>
      <h2 id={id}>{children}</h2>
    </>
  );
}
