import { Listing, Property } from '../types';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export const buildListingSlug = (listing: Listing) => {
  const base = slugify(listing.name || listing.address || listing.id);
  const safeBase = base || listing.id.toLowerCase();
  return `${safeBase}-${listing.id}`;
};

export const buildPropertySlug = (property: Property) => {
  const base = slugify(property.address || property.id);
  const safeBase = base || property.id.toLowerCase();
  return `${safeBase}-${property.id}`;
};

export const listingMatchesSlug = (listing: Listing, slug: string) => {
  const normalized = slugify(slug);
  if (!normalized) return false;
  if (listing.id.toLowerCase() === slug.toLowerCase()) return true;
  if (buildListingSlug(listing) === normalized) return true;
  if (normalized.endsWith(listing.id.toLowerCase())) return true;
  if (slugify(listing.name) === normalized) return true;
  return slugify(listing.address) === normalized;
};
