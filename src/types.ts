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
  codigo?: string; // Unique immutable code identifier (e.g. "yolocraft")
  tipo?: "projeto";
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  categoryId: string; // References ProjectCategory.id
  category?: string;
  categoryEn?: string;
  tags: string[];
  projectUrl?: string; // Demo link
  githubUrl?: string; // Repository link
  repositoryUrl?: string;
  imageUrl?: string; // Main cover
  galleryImages?: string[]; // Additional gallery images
  images?: string[]; // Alias for galleryImages
  detailedDescription?: string; // Main MDX/Markdown content body
  detailedDescriptionEn?: string;
  longDescription?: string; // Alias for detailedDescription
  longDescriptionEn?: string;
  scientificRelevance?: string; // Technical & scientific relevance
  scientificRelevanceEn?: string;
  featured?: boolean;
  destaque?: boolean; // ETAPA 9 featured status
  ordemDestaque?: number; // Ordering for featured items
  blogPostId?: string; // Direct link to blog post
  status?: string;
  periodo?: string | {
    inicio: string;
    fim?: string;
  };
  stack?: string[]; // Technologies array
  technologies?: string[]; // Alias for stack
  repositorio?: string; // Alias for githubUrl
  demo?: string; // Alias for projectUrl
  liveUrl?: string;
  demoUrl?: string;
  link?: string;
  documentationUrl?: string;
  paperUrl?: string;
  highlights?: string[];
  highlightsEn?: string[];
  data?: string;
  draft?: boolean;
}

export interface Subperiod {
  id: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
}

export interface ExperienceLink {
  title: string;
  url: string;
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
  endDate?: string;
  current?: boolean;
  description: string;
  descriptionEn?: string;
  type?: "research" | "academic";
  skills?: string[];
  subperiods?: Subperiod[];
  links?: ExperienceLink[];
  projetos?: string[]; // Array of project codes referenced
}

export interface AcademicActivity {
  id: string;
  name: string;
  nameEn?: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description: string;
  descriptionEn?: string;
  extraContent?: string;
  extraContentEn?: string;
  links?: ExperienceLink[];
  projetos?: string[]; // Array of project codes referenced
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
  codigo?: string; // Optional unique code identifier
  tipo?: "artigo";
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
  projetos?: string[]; // Array of project codes referenced (ETAPA 9)
  draft?: boolean;
}

export interface ResumeData {
  profile: Profile;
  categories: ProjectCategory[];
  projects: Project[];
  experiences: Experience[];
  academicActivities?: AcademicActivity[];
  educations: Education[];
  skills: Skill[];
  courses?: Course[];
  posts?: BlogPost[];
}
