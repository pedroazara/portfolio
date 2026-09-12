import React from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Download, PenLine, Presentation, ArrowUpRight } from "lucide-react";
import { Profile } from "../types";
import { Language } from "../lib/translations";
import { localePath } from "../lib/routes";

interface CurriculoResumoProps {
  profile: Profile;
  isEditMode: boolean;
  onOpenPdfPreview: () => void;
  onOpenElevatorPitchEditor?: () => void;
  language?: Language;
}

export default function CurriculoResumo({ profile, isEditMode, onOpenPdfPreview, onOpenElevatorPitchEditor, language = "pt" }: CurriculoResumoProps) {
  const en = language === "en";
  const title = (en && profile.titleEn) || profile.title;
  const links = [
    { label: "Lattes", url: profile.lattesUrl, prefix: "https://" },
    { label: "ORCID", url: profile.orcidUrl, prefix: "https://" },
    { label: "GitHub", url: profile.github, prefix: "https://github.com/" },
    { label: "LinkedIn", url: profile.linkedin, prefix: "https://linkedin.com/in/" },
  ].filter(link => link.url);

  return (
    <header id="perfil" className="cv-identity">
      <div className="cv-identity-top">
        <h1 className="cv-page-title">{en ? "Curriculum vitae" : "Currículo"}</h1>
        <div className="cv-actions no-print">
          {isEditMode && <Link to={localePath("/", language)} className="cv-button"><PenLine size={16} />{en ? "Edit profile" : "Editar perfil"}</Link>}
          {isEditMode && onOpenElevatorPitchEditor && <button type="button" onClick={onOpenElevatorPitchEditor} className="cv-button"><Presentation size={16} />Elevator Pitch</button>}
          <button type="button" onClick={onOpenPdfPreview} className="cv-button cv-button-primary"><Download size={17} />{en ? "Download CV" : "Baixar currículo"}<span className="cv-pdf-label">PDF</span></button>
        </div>
      </div>
      <div className="cv-identity-main">
        <div className="cv-intro">
          <p className="cv-owner">{profile.name}</p>
          {title && <p className="cv-title">{title}</p>}
        </div>
      </div>
      <div className="cv-contact">
        {profile.email && <a href={`mailto:${profile.email}`}><Mail size={16} /><span>{profile.email}</span></a>}
        {profile.location && <span><MapPin size={16} />{profile.location}</span>}
        {links.map(link => <a key={link.label} href={/^https?:\/\//i.test(link.url!) ? link.url : `${link.prefix}${link.url}`} target="_blank" rel="noopener noreferrer">{link.label}<ArrowUpRight size={14} /></a>)}
      </div>
    </header>
  );
}
