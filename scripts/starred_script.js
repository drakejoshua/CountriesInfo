/* 
    the StatefulElement class

    this class acts as a stateful representation of an HTML element.
    it's created because it's used to manage the UI/display state of an element 

    for instance, some live/changing part of an XHR app may have multiple states: loading, load-success, load-eror
    and you might want to represent this in the display logic/UI of that part without having to re-write
    all the repetitive javascript / functions used to do this. 

    this class allows you to create a representation of that element having to account for these states, 
    their display/UI representation and also handling state changes in connection to their UI display

    features of the class:
        - manages internal application state in connection to the application UI for a live element
        - handling state changes and doing proper updates on the UI using only a state-listener
        - allows addition of mulitple states in the state listener without having to write repetitive code
        - allows you to also access the stateful-representation of the element using it's DOM representation
          in things like event listeners

    the class holds a reference to the DOM element object of the HTML element it's representing on the UI,
    an internalState value for the stateful representation of the object and a state-listener to handle state changes

    the class constructor accepts:
        - an HTML DOM element object( as element )
        - any javascript value to represent the initial stateful value ( as initialInternalState )
        - a function to be called when listening to state changes in the object ( as stateListener )

    the class methods and properties are descriptive enough so that's all
*/


class StatefulElement {

    // class constructor
    constructor( element, initialInternalState, stateListener ) {
        this._element = element;
        this._stateListener = stateListener;
        this._internalState = initialInternalState;

        // adding the stateful-element representation of the element to it's
        // DOM representation
        this._element.statefulRepresentation = this;

        this._reportInternalStateChange();
    }

    // the internalState getter and setter
    get internalState() {
        return this._internalState;
    }
    set internalState( internalState ) {
        this._internalState = internalState;

        this._reportInternalStateChange();
    }

    // the reportStateChange() method
    // used to report changes in state on the UI by calling the stateListener
    // function with the internalState and element as it's argument
    _reportInternalStateChange() {
        this._stateListener( this._internalState, this._element );
    }
}



/* 
    the ModularTemplate class

    the class acts as a template for repetitively creating elements
        - that render into a common parent 
        - have different view states
        - have the same view layer( i.e. document structure-HTML, styling-CSS and functionality-JS )
        - that come from the same parent data( i.e. like an array of data from an API or localStorage )

    the class main use-case is for repetitively creating DOM element objects from the same html template
    .. for instance, you want to repetitively insert custom HTML list-items into a to-do list parent ctn,
    the class allows you to specify a common parent, common template/view-layer, other info, decompose
    parent data and then repetitvely insert/render elements into the parent and set instructions to run 
    on render( e.g. attaching event listeners, assigning initial state and so on as much as you deem fit )

    the class constructor accepts:
        - a string that is used as the class-name( used in html classes ) of the rendered elements( as className )
        - a DOM element that acts as the parent for the rendered elements( as parent )
        - a function containing the initial render instructions for a newly rendered element( as renderFunction ),
            it's called with the DOM object of the newly-rendered element
        - a function which contains the template of the renderable elements and is called with data that'll be
            used on the template and it must return a string that contains the template with the argument data 
            infused into it( as templateGenerator )
        - a function used as the state-listener for the stateful-element representation of the element's DOM object 
            ( as stateListener )
*/


class ModularTemplate {

    // the class constructor
    constructor( className, parent, renderFunction,
         templateGenerator, stateListener ) {
            this._className = className;
            this._parent = parent;
            this._renderFunction = renderFunction;
            this._templateGenerator = templateGenerator;
            this._stateListener = stateListener;
    }

    // the insert() method
    // used to insert new elements based on saved template into the saved parent with new data and initialState
    insert( data, initialState ) {

        // call the template generator to generate an populated html string with the data
        var htmlDataString = this._templateGenerator( data );

        // assign the template class name into the htmlDataString for proper grouping and identification
        htmlDataString = htmlDataString.replace( "mod-replace", `class="${ this._className }"` );

        // add the populated HTMLDataString to the parent element/container
        this._parent.innerHTML += htmlDataString;

        // get the DOM representation of the added html-data-string 
        var elementDOMRep = document.getElementsByClassName(`${ this._className }`)[ 
            document.getElementsByClassName(`${ this._className }`).length - 1 ];

        // creating a stateful-element representation of the element's DOM object
        new StatefulElement( elementDOMRep, initialState, this._stateListener );

        // executing the initial render instructions for the newly added element
        this._renderFunction( elementDOMRep );
    }
}



// import the DOM elements needed for the page's script
var countryListCtn = document.getElementById('countries-list-ctn'),
    previousPageButton = document.getElementById('previous-page'),
    nextPageButton = document.getElementById('next-page'),
    pageRange = document.getElementById('page-range'),
    searchInput = document.getElementById('search-input'),
    filterSelect = document.getElementById('filter-select');

// declare and initializa the data variables needed for the program to work
var paginatedAppData,           // used to keep a 2D array used to represent paginated results
    pageNumber,         // used to keep the current page number
    starredCountriesNames,          // used to keep the imported list of starred country names from localStorage
    normalFetchData;


// import the list of the starred country names( as an array ) from localStorage in order to 
// do the render of starred and unstarred elements
// 
// also check if the list is empty, start with an empty list, if not, use the imported list
starredCountriesNames = JSON.parse( localStorage.getItem('starred-countries-info-names') );

if ( starredCountriesNames == null ) {
    starredCountriesNames = [];
}


// the API endpoints to use to do the fetching and searching of external countries data 
const API_ENDPOINT_FOR_NAME = "https://restcountries.com/v3.1/name/";
const API_ENDPOINT_FOR_CONTINENT = "https://restcountries.com/v3.1/region/";
const API_ENDPOINT_FOR_SUB_REGION = "https://restcountries.com/v3.1/subregion/";
const API_ENDPOINT_FOR_COUNTRY_CODE = "https://restcountries.com/v3.1/alpha/";
const API_ENDPOINT_FOR_CURRENCY = "https://restcountries.com/v3.1/currency/";
const API_ENDPOINT_FOR_LANGUAGE = "https://restcountries.com/v3.1/lang/";
const API_ENDPOINT_FOR_CAPITAL_CITY = "https://restcountries.com/v3.1/capital/";
const API_ENDPOINT_NO_FILTER = "https://restcountries.com/v3.1/all";


// the modular template object to use to repetitively render the fetched country 
// information into the display of the elements
var countryInfoTemplate = new ModularTemplate( 'country-info', countryListCtn, countryInfoRenderFunction, 
        countryInfoTemplateGenerator, countryInfoStateListener );

// the countryInfoTemplateGenerator() to use to generate html template data for the countryInfoTemplate
function countryInfoTemplateGenerator( templateData ) {
    return `<div mod-replace>
                <img src="${ ( templateData.flags.svg ) ? templateData.flags.svg : 'not available' }" 
                    alt="${ ( templateData.flags.alt ) ? templateData.flags.alt : 'not available' }">

                <div class="desc-ctn">
                    <h2>${ ( templateData.name.common ) ? templateData.name.common : 'not available' } 
                    ( ${ templateData.cioc || templateData.cca3 } ) </h2>
                    <span>${ ( templateData.name.official ) ? templateData.name.official : 'not available' }</span>
                </div>

                <span data-desc="language(s): ">
                    ${ ( templateData.languages != undefined ) ? Object.values( templateData.languages ).join(", ") : "not available"  }
                </span>

                <span data-desc="continent: ">
                    ${ ( templateData.region != undefined ) ? templateData.region : 'not available' } ( 
                        ${ ( templateData.subregion != undefined ) ? templateData.subregion : 'not available'   } ) 
                </span>

                <span data-desc="timezone(s): ">
                    ${ ( templateData.timezones != undefined ) ? templateData.timezones.join( ", " ) : 'not available' }
                </span>

                <span data-desc="capital(s): ">
                    ${ ( templateData.capital != undefined ) ? templateData.capital.join( ", " ) : 'not available' }
                </span>

                <div class="action-ctn">
                    <a href="full_details.html?name=${ templateData.name.common }">
                        read more 
                    </a>
                    <span class="fa-star star-element" onclick="toggleStarredState( this, '${ templateData.name.common }' )"></span>
                </div>
            </div>
        `;
}
function countryInfoStateListener( state, element ) {
    if ( state == 'starred' ) {
        element.children[6].lastElementChild.classList.remove('fas','far');
        element.children[6].lastElementChild.classList.add('fas');
    } else if ( state == 'unstarred' ) {
        element.children[6].lastElementChild.classList.remove('fas','far');
        element.children[6].lastElementChild.classList.add('far');
    }
}
function countryInfoRenderFunction( element ) {    
    null;
}


// the body's stateful representation used for doing UI state updates such as: loading state, error state..etc
var bodyStatefulRepresentation = new StatefulElement( document.body, { type:'loading' }, function ( internalState, element ) {
    switch ( internalState.type ) {
        case 'loading':
            element.classList.remove( 'loading', 'error', 'data' );
            element.classList.add('loading');
        break;

        case 'error':
            element.classList.remove( 'loading', 'error', 'data' );
            element.classList.add('error');
        break;
        
        case 'data':
            element.classList.remove( 'loading', 'error', 'data' );
            element.classList.add('data');
        break;
    
        default:
            break;
    }
} ),
    // the page-range's stateful representation used for doing UI state updates ( i.e. change in current page number )
    pageRangeStatefulRepresentation = new StatefulElement( pageRange, { pageNumber: 1, totalPages: 9 }, function( internalState, element ) {
        element.innerHTML = `${ internalState.pageNumber } of ${ internalState.totalPages }`;
    }),
    // the previous-page's stateful representation used for doing UI state updates ( i.e. whether invalid or valid for navigation of pages )
    previousPageButtonStatefulRepresentation = new StatefulElement( previousPageButton, 'invalid', function( internalState, element ) {
        switch( internalState ) {
            case 'valid':
                element.classList.remove('invalid');

                element.addEventListener( 'click', switchToPreviousPage );
            break;
            
            case 'invalid':
                element.classList.add('invalid');

                element.removeEventListener( 'click', switchToPreviousPage );
            break;
        }
    } ),
    // the next-page's stateful representation used for doing UI state updates ( i.e. whether invalid or valid for navigation of pages )
    nextPageButtonStatefulRepresentation = new StatefulElement( nextPageButton, 'valid', function( internalState, element ) {
        switch( internalState ) {
            case 'valid':
                element.classList.remove('invalid');

                element.addEventListener( 'click', switchToNextPage );
            break;
            
            case 'invalid':
                element.classList.add('invalid');

                element.removeEventListener( 'click', switchToNextPage );
            break;
        }
    } );



// the fetchCountriesData()
// this function is used to async fetch the data of all
// the countries from the ( REST Countries API ) and then return it to the calling/invoking function
async function fetchCountriesData( filterType, searchValue ) {

    // decide which endpoint to use in the fetch based on the filterType and initialize the fetch
    switch ( filterType ) {
        case 'all':
            var response = await fetch( API_ENDPOINT_NO_FILTER );
        break;
        
        case 'name':
            var response = await fetch( API_ENDPOINT_FOR_NAME + searchValue );
        break;
        
        case 'country-code':
            var response = await fetch( API_ENDPOINT_FOR_COUNTRY_CODE + searchValue );
        break;
        
        case 'currency':
            var response = await fetch( API_ENDPOINT_FOR_CURRENCY + searchValue );
        break;
        
        case 'language':
            var response = await fetch( API_ENDPOINT_FOR_LANGUAGE + searchValue );
        break;
        
        case 'capital-city':
            var response = await fetch( API_ENDPOINT_FOR_CAPITAL_CITY + searchValue );
        break;
        
        case 'continent':
            var response = await fetch( API_ENDPOINT_FOR_CONTINENT + searchValue );
        break;
        
        case 'subregion':
            var response = await fetch( API_ENDPOINT_FOR_SUB_REGION + searchValue );
        break;
    
        default:
            var response = await fetch( API_ENDPOINT_NO_FILTER );
        break;
    }
    
    // check the status of the fetched dat if ok
    // if so, return the fethed data, if not, return an error message or an empty array based on as the case maybe
    if ( response.status == 200 )
    {
        var data = await response.json();

        return data;
    } 
    else if ( response.status == 404 )
    {
        return [];
    }
    else 
    {
        return 'error';
    }
}


// the getStarredCountries()
// this function is used to get starred countries data( based on the imported list from localStorage ) 
// from the array passed to it and then return the gotten starred countries data
function getStarredCountries( countries ) {
    var starredCountries = [];
    
    // loop through the argument array and check if the imported list contains that name
    // if so, add the object to the starredCountries array
    for ( var country of countries ) {
        if ( starredCountriesNames.includes( country.name.common ) ) {
            starredCountries.push( country );
        }
    }

    return starredCountries;
}


// the paginateData()
// this function is used to paginate fetched data( as/to a 2D array representing pages and results ) 
// and return it
function paginateData( numberOfResultsPerPage, ArrayToPaginate ) {
    if ( ArrayToPaginate == [] || ArrayToPaginate == null ) {
        return [];
    } else {
        if ( ArrayToPaginate.length >= ( 2 * numberOfResultsPerPage ) ) {
            var possibleNumberOfPages = Math.round( ArrayToPaginate.length / numberOfResultsPerPage );
        } else if ( ArrayToPaginate.length >= numberOfResultsPerPage ) {
            var possibleNumberOfPages = Math.ceil( ArrayToPaginate.length / numberOfResultsPerPage );
        } else {
            var possibleNumberOfPages = 1;
        }

        var paginatedArray = [];


        for ( var pageNumber = 1; pageNumber <= possibleNumberOfPages; pageNumber++ ) {
            var startIndex = ( pageNumber - 1 ) * numberOfResultsPerPage;
            var endIndex = ( pageNumber * numberOfResultsPerPage ) - 1;
            var page = [];

            if ( endIndex > ( ArrayToPaginate.length - 1 ) ) {
                endIndex = ( ArrayToPaginate.length - 1 );
            }

            for ( ; startIndex <= endIndex; startIndex++ ) {
                page.push( ArrayToPaginate[startIndex] );
            }

            paginatedArray.push(page);
        }

        return paginatedArray;
    }
}


// the switchTo* functions
// this functions are used to traverse the paginated data
// ( i.e. paginatedAppData ) switching betweeen pages by changing 
// the page number and displaying data based on the new page number
function switchToNextPage() {
    // increment the current page number value
    pageNumber++;

    // check if there's overflow in the page number increment and correct it
    if ( pageNumber >= paginatedAppData.length ) {
        pageNumber = paginatedAppData.length;
    }

    // display page data based on the new page number
    displayData();
}
function switchToPreviousPage() {
    // decrement the current page number value
    pageNumber--;

    // check if there's overflow in the page number decrement and correct it
    if ( pageNumber < 1 ) {
        pageNumber = 1;
    }

    // display page data based on the new page number
    displayData();
}


// the displayData()
// this function is used to display the paginated data by the current page number on the page
// and also update the page-range and page number
function displayData() {
    // check if paginated data is not empty
    // if so, display the page based on the page number using the countryinfo-modular-template 
    // and also update the previous and next page buttons and the page range
    // if not, display that no data is displayable in the page
    if ( paginatedAppData.length != 0 ) {

        // reset the style and content of the country-list
        countryListCtn.innerHTML = "";      
        countryListCtn.style.height = 'max-content';

        // loop through the paginatedAppData based on the current page number and 
        // use the countryinfo-modular-template to repetitively insert country-info 
        // template data into the country-list
        for ( var displayData of paginatedAppData[ ( pageNumber - 1 ) ] ) {
            countryInfoTemplate.insert( displayData, 'starred' );
        }

        // updating the UI display state of the previous page button
        if ( ( pageNumber - 1 ) == 0 ) {
            previousPageButtonStatefulRepresentation.internalState = 'invalid';
        } else {
            previousPageButtonStatefulRepresentation.internalState = 'valid';
        }

        // updating the UI display state of the next page button
        if (  pageNumber == paginatedAppData.length ) {
            nextPageButtonStatefulRepresentation.internalState = 'invalid';
        } else {
            nextPageButtonStatefulRepresentation.internalState = 'valid';
        }

        // updating the UI display state of the page-range( i.e. changing the page number and/or total number of pages )
        pageRangeStatefulRepresentation.internalState = { pageNumber: pageNumber, totalPages: paginatedAppData.length };

    } else {
        // the display message in the country-list
        countryListCtn.innerHTML = `
            <span>
                <span class="fas fa-exclamation-triangle"></span>
                no search results
            </span>
        `;

        // changing the style of the country-list
        countryListCtn.style.height = '16rem';

        // changing the UI state of the previous, next buttons and the page-range
        pageRangeStatefulRepresentation.internalState = { pageNumber: 0, totalPages: paginatedAppData.length };
        nextPageButtonStatefulRepresentation.internalState = 'invalid';
        previousPageButtonStatefulRepresentation.internalState = 'invalid';
    }
}


// the toggleStarredState()
// this function is used to implement the starred page functionality by adding/removing 
// a country's name in the starred list from localStorage and also toggling UI state 
// for the starred button on the page
function toggleStarredState( element, countryName ) {

    // check if the clicked starred element is starred or not
    // if so, unstar it and remove the associated country name from the starred-country-names in localStorage
    // if not, star it and add the associated country name to the starred-country-names in localStorage
    if ( element.classList.contains( 'far' ) ) {
        starredCountriesNames.push( countryName );

        element.classList.remove('far');
        element.classList.add('fas');

        localStorage.setItem( 'starred-countries-info-names', JSON.stringify( starredCountriesNames ) );
    } else {
        starredCountriesNames.splice( starredCountriesNames.indexOf( countryName ), 1 );
        
        element.classList.remove('fas');
        element.classList.add('far');
        
        localStorage.setItem( 'starred-countries-info-names', JSON.stringify( starredCountriesNames ) );
    }

    paginatedAppData = paginateData( 12, getStarredCountries( normalFetchData ) );
    displayData();
}




// kickstart the application by doing the initial fetch and display
document.addEventListener( 'DOMContentLoaded', function() {
    fetchCountriesData('all')
    .then(
        function( data ) {
            if ( data != 'error' ) {
                bodyStatefulRepresentation.internalState = { type: 'data' };

                normalFetchData = data;

                paginatedAppData = paginateData( 12, getStarredCountries( normalFetchData ) );
                pageNumber = 1;

                displayData();
            } else {
                bodyStatefulRepresentation.internalState = { type: 'error' };
            }
        }
    )
    .catch(
        function() {
            bodyStatefulRepresentation.internalState = { type: 'error' };
        }
    );
} );