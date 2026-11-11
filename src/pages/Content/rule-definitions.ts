const autoGenerateFileNames = [
  'Gemfile.lock',
  'yarn.lock',
  'structure.sql',
  'translations/en.ts',
  'schema.graphql',
  'types.ts',
  '.gql.ts',
  'graph/index.ts',
  '.generated.ts'
]

export const rules = [
  {name: 'autoCollapseRule', specifics: {autoGenerateFileNames}},
  {name: 'moveCompareButtonRule', specifics: {}},
  {name: 'peakonRememberAnswersRule', specifics: {}},
  {name: 'markFileAsViewedRule', specifics: {}},
  {name: 'goToLineInEditorRule', specifics: {repoMappings: {}}},
  {name: 'autoExpandLargeDiffRule', specifics: {autoGenerateFileNames}},
  {name: 'copyFileNameRule', specifics: {}},
  {name: 'copyReviewLinksRule', specifics: {}},
  {name: 'submitReviewShortcutsRule', specifics: {}},
  {name: 'highlightSelectionRule', specifics: {}}
]
