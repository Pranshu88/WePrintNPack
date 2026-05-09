export type Category = {
  slug: string;
  name: string;
  shortTitle: string;
  description: string;
  groupSlug: string;
};

export type ColorVariant = {
  hex: string;
  name: string;
  frontImage: string;
  backImage?: string;
};

export type Product = {
  slug: string;
  name: string;
  category: string;
  categoryName: string;
  image: string;
  description: string;
  startingPrice: string;
  specs: Array<{
    label: string;
    value: string;
  }>;
  colors?: string[];
  colorVariants?: ColorVariant[];
  createdAt?: string;
  updatedAt?: string;
};
