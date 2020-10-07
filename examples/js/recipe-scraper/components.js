// components for recipe scraper application

axios = require('axios')

fetch_page_content = async ( package ) => {
  // fetch page content given URLs
  output = []
  for (var i=0; i<package.length; i++){
    try {
      let URL = package[i];
      let html = await axios.get(URL).then((resp) => { return resp.data }).catch((err) => { })
      output.push(html)
    } catch(err){
      console.log(err)
    }
  }
  return output
}

parse_recipe_links = ( package ) => {
  // parse recipe links from HTML body
  let output = [  ]
  try {
    let [ html ] = package;
    html.split('<div class="field_title"><a href="').slice(1,).forEach(( selection ) => {
      output.push( 'https://www.foodhero.org' + selection.split('"')[0] )
    })
  } catch(err){
    console.log(err)
  }
  return output
}

get_JSON_recipes = async ( package ) => {
  // scrape JSON recipe from each page (given URLs)
  let htmls = await fetch_page_content( package );
  let output = [ ]
  htmls.forEach(( html ) => {
    try {
      output.push( JSON.parse(html.split('<script type="application/ld+json">').slice(1,)[0].split('</script>')[0]) )
    } catch(err){
      console.log(err)
    }
  })
  return output
}
