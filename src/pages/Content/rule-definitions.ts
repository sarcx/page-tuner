export const rules = [
  {
    name: 'autoCollapseRule',
    specifics: {
      autoGenerateFileNames: [
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
    }
  },
  {name: 'moveCompareButtonRule', specifics: {}},
  {name: 'peakonRememberAnswersRule', specifics: {}},
  {name: 'markFileAsViewedRule', specifics: {}},
  {name: 'goToLineInEditorRule', specifics: {repoMappings: {}}}
]
