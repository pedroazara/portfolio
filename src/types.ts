export interface Profile {
  name: string;
  title: string;
  titleEn?: string;
  bio: string;
  bioEn?: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  avatarUrl?: string;
  badgeIconUrl?: string;
}

export interface ProjectCategory {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
}

export interface Project {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  categoryId: string; // References ProjectCategory.id
  tags: string[];
  projectUrl?: string;
  githubUrl?: string;
  imageUrl?: string;
  galleryImages?: string[]; // Galeria de imagens adicionais
  detailedDescription?: string; // Descrição longa e detalhada do projeto
  detailedDescriptionEn?: string;
  scientificRelevance?: string; // Relevância técnica e científica para Engenharia Física
  scientificRelevanceEn?: string;
  featured?: boolean;
  blogPostId?: string; // Link direto para um artigo do blog
}

export interface Experience {
  id: string;
  company: string;
  companyEn?: string;
  role: string;
  roleEn?: string;
  location?: string;
  locationEn?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  descriptionEn?: string;
}

export interface Education {
  id: string;
  institution: string;
  institutionEn?: string;
  degree: string;
  degreeEn?: string;
  fieldOfStudy: string;
  fieldOfStudyEn?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description?: string;
  descriptionEn?: string;
}

export interface Skill {
  id: string;
  name: string;
  nameEn?: string;
  category: string; // e.g., "Frontend", "Backend", "Design", "Idiomas"
  categoryEn?: string;
  level: number; // 1 to 5 stars or percentage
}

export interface Course {
  id: string;
  name: string;
  nameEn?: string;
  organization: string;
  organizationEn?: string;
  issueDate: string;
  description?: string;
  descriptionEn?: string;
  credentialUrl?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  titleEn?: string;
  content: string;
  contentEn?: string;
  summary: string;
  summaryEn?: string;
  date: string;
  tags: string[];
  imageUrl?: string;
  readTime?: string;
  category?: string;
  categoryEn?: string;
}

export interface ResumeData {
  profile: Profile;
  categories: ProjectCategory[];
  projects: Project[];
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  courses?: Course[];
  posts?: BlogPost[];
}
