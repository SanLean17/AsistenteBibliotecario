// Every pre-V2 CI scenario is retained; shards are disjoint to avoid duplicate setup.
export const browserSuites={
 core:['rc1-browser','entry-browser','help-browser','audit-v2-browser'],
 circulation:['notices-browser','desk-browser','reader-browser','collection-planning-browser','inventory-dual-browser'],
 cataloging:['cataloging-browser','assistance-browser','ocr-engine-browser','camera-navigation'],
 institutional:['pilot-browser','school-pilot-browser','teaching-browser','analytics-browser','organization-browser','organization-responsive-browser','organization-migration-browser'],
 interoperability:['federation-browser','migration-browser','migration-center-browser','holding-identity-browser','access-browser','import-browser','hemeroteca-browser'],
 field:['field-offline-browser','field-volume-browser','field-school-browser','audit-v2-storage-browser'],
 compatibility:['field-cross-browser']
};
