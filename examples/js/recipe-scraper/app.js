// process code: recipe scraper

tdmf = require('tdmf')
require('./components.js')

// register tests

tdmf.testEngine.add_test('package', 'fetch_page_content', 'pt_string_only')
tdmf.testEngine.add_test('package', 'parse_recipe_links', 'pt_string_only')
tdmf.testEngine.add_test('package', 'get_JSON_recipes', 'pt_string_only')
tdmf.testEngine.add_test('unit', 'fetch_page_content', ['fetch-test', ['https://cmdimkpa.github.io/test.txt'], ['test\n'] ])

// pipeline to farm recipe links from entry page
farm_recipe_links = tdmf.Pipeline([
    [ "fetch_page_content", ["https://www.foodhero.org/recipes/categories/42"] ],
    "parse_recipe_links"
])

// pipeline to extract JSON recipes from recipe links
extract_JSON_recipes = tdmf.Pipeline([
    [ "get_JSON_recipes", "farm_recipe_links" ]
])

// workflow to manage process flow
recipe_workflow = tdmf.Workflow([
    "farm_recipe_links",
    "extract_JSON_recipes"
])

// run workflow
tdmf.run_workflow( recipe_workflow ).then(( workflow ) => {
        console.log( workflow.output )
})
