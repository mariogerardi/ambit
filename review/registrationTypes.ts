export interface RegistrationPreview {
  action: "add" | "remove";
  title: string;
  id: string;
  module: string;
  route: string;
  revision: string;
  files: string[];
}

export interface RegistrationPlan {
  preview: RegistrationPreview;
  files: string[];
  before: string[];
  after: string[];
}

export interface CatalogStatus {
  registered: boolean;
  route?: string;
  canRemove: boolean;
  reason?: string;
}
