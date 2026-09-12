import React from "react";
import "./curriculo.css";

interface Props {
  header: React.ReactNode;
  children: React.ReactNode;
}

export default function CurriculoLayout({ header, children }: Props) {
  return (
    <div className="cv-page">
      {header}
      <div className="cv-layout">
        <div className="cv-content">{children}</div>
      </div>
    </div>
  );
}
