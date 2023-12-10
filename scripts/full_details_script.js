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




// create a stateful representation for the body in order to do UI 
// states such as: loading, error
var bodyStatefulRepresentation = new StatefulElement( document.body, 'loading', 
    function( internalState, element ) {
        switch ( internalState ) {
            case 'loading':
                document.body.classList.remove('loading','error','data');
                document.body.classList.add('loading');
            break;
            
            case 'error':
                document.body.classList.remove('loading','error','data');
                document.body.classList.add('error');
            break;
            
            case 'data':
                document.body.classList.remove('loading','error','data');
                document.body.classList.add('data');
            break;
        
            default:
                break;
        }
});


// import the list of starred country names from localStorage
var starredCountryNames = JSON.parse( localStorage.getItem("starred-countries-info-names") );

if ( starredCountryNames == null ) {
    starredCountryNames = [];
}


// create the global variables needed for the script to work
var countryData;       // holds the fetched country data

// import the DOM elements needed for page updates
var pageHeadline = document.querySelector('main > div#headline > div > h1'),
    pageSubheadline = document.querySelector('main > div#headline > div > span'),
    starElement = document.querySelector('main > div#headline > span'),
    pageBanner = document.querySelector('main'),
    description = document.querySelector('section#description > p'),
    accordionTopics = document.getElementsByClassName('accordion-topic'),
    translations = document.querySelector('div#translations'),
    coatOfArmsImage = document.querySelector('img.coat-of-arms'),
    countryFlagImage = document.querySelector('img.country-flag'),
    coatOfArmsCaption = document.querySelector('figcaption.coat-of-arms'),
    countryFlagCaption = document.querySelector('figcaption.country-flag');



// add the display logic to the accordion on the page
for ( var topic of accordionTopics ) {
    topic.addEventListener( 'click', function( event ) {
        if ( event.target.classList.contains('show') ) {
            event.target.classList.remove('show');
        } else {
            event.target.classList.add('show');
        }
    })
}

// add the toggle star logic for the starElement
starElement.addEventListener( 'click', function( event ) {
    if ( event.target.classList.contains( 'fas' ) ) {
        starElement.classList.remove('far','fas');
        starElement.classList.add( 'far' );

        unstarCountry();
    } else {
        starElement.classList.remove('far','fas');
        starElement.classList.add( 'fas' );

        starCountry();
    }
})



// the fetchCountryData()
// used to async fetch country data from the rest countries API using the 
// country's name
async function fetchCountryData( countryName ) {
    // send the request to the API
    var resp = await fetch( `https://restcountries.com/v3.1/name/${countryName}?fullText=true` );

    // check response status and convert response data to json if okay
    if ( resp.status == 200 ) {
        var data = await resp.json();

        return data;
    } else {
        return 'error';
    }
}


// the updatePageWithCountryData()
// used to update the page with the fetched country data using the global 'countryData'
// variable
function updatePageWithCountryData() {
    // set the page's title to the right country name
    document.title = `About - ${ countryData[0].name.common }`;


    // update the page headline( common country name ) and subheadline( official country name )
    pageHeadline.innerHTML = countryData[0].name.common;
    pageSubheadline.innerHTML = countryData[0].name.official;


    // check if country is starred by user and update as such
    if ( starredCountryNames.includes( countryData[0].name.common ) ) {
        starElement.classList.remove('far','fas');
        starElement.classList.add( 'fas' );
    }

    // update the page banner overlay and image flag
    pageBanner.style.backgroundImage = `linear-gradient( 90deg, var(--primary-blue), var(--primary-blue), var(--primary-blue)
    , transparent ), url(${ countryData[0].flags.svg })`;


    // create and update the description on the page
    var otherCountryNames = [];
    var namesIterable = Object.values( countryData[0].name.nativeName );
    
    for ( var name of namesIterable ) {
        otherCountryNames.push( name.official );
    }

    var fifaRankings = "";
    var fifaIterable = ( countryData[0].gini != undefined ) ? Object.entries( countryData[0].gini ) : [] ;
    for ( var ranking of fifaIterable ) {
        fifaRankings += `${ ranking[1] } in ${ ranking[0] }`;
    }

    var currencies = "";
    var currenciesIterable = Object.values( countryData[0].currencies );

    for ( var currency of currenciesIterable ) {
        currencies += `${ currency.name } and denoted by the symbol( ${ currency.symbol } )`;
    }

    description.innerHTML = `
            ${ countryData[0].name.common }, identified by the country code ${ countryData[0].cioc || countryData[0].cca3 },
            is also referred to as the ${ countryData[0].name.official } or, 
            in its various native language(s): ${ otherCountryNames.join(', ') }. Situated within the region of ${ countryData[0].subregion }, ${ countryData[0].name.common }
            is inhabited by 
            approximately ${ countryData[0].population } individuals and encompasses an expansive area measuring ${ countryData[0].area } square kilometers. 
            The nation boasts ${ Object.values( countryData[0].languages ).length } official language(s), namely: ${ Object.values( countryData[0].languages ).join(", ") }.
            In the realm of sports, ${ countryData[0].name.common } ${ ( fifaRankings != "" ) ? `held a FIFA ranking of ${ fifaRankings }` : `holds no FIFA rankings` } 
            and follows a ${ countryData[0].car.side }-hand driving style. The official currency utilized in ${ countryData[0].name.common } is the ${ currencies }
            . Employing the international dialing code ${ countryData[0].idd.root } ( ${ countryData[0].idd.suffixes.join(", ") } ),
            the country's week kickstarts on a ${ countryData[0].startOfWeek }. As an ${ ( countryData[0].independent ) ? "independent" : "non-independent" } entity, 
            ${ countryData[0].name.common } also holds the distinction of being a ${ ( countryData[0].unMember ) ? "member" : "non-member" } state within the United Nations.
    `;


    // update the translations on the page
    var translationsIterable = Object.values( countryData[0].translations );
    var translation = '';

    for ( var trans of translationsIterable ) {
        translation += ` ${ trans.official }, ${ trans.common },`;
    }

    translations.innerHTML = translation;


    // update the images of the national symbols and their captions on the page
    countryFlagImage.src = `${ countryData[0].flags.svg }`;
    countryFlagImage.alt = `${ countryData[0].flags.alt }`;

    coatOfArmsImage.src = `${ countryData[0].coatOfArms.svg }`;
    coatOfArmsImage.alt = `The ${ countryData[0].name.official } coat of arms`;

    coatOfArmsCaption.innerHTML = `${ countryData[0].name.official } coat of arms`;
    countryFlagCaption.innerHTML = `${ countryData[0].name.official } flag`;
}


// the starCountry()
// used to star( add a ) country to the starred list of countries using the countryData
function starCountry() {
    starredCountryNames.push( countryData[0].name.common );

    localStorage.setItem( "starred-countries-info-names", JSON.stringify( starredCountryNames ) );
}


// the unstarCountry()
// used to unstar( remove a ) country from the starred list of countries using the countryData
function unstarCountry() {
    starredCountryNames.splice( starredCountryNames.indexOf( countryData[0].name.common ), 1 );

    localStorage.setItem( "starred-countries-info-names", JSON.stringify( starredCountryNames ) );
}





// get the country-name from the name query-parameter using the URL API( see on mdn )
var urlObject = new URL( window.location.toString() );
var countryName = urlObject.searchParams.get('name');

// validate the value
// if valid, fetch country data based on country name and update page with data
// if invalid, display error UI state on page
if ( countryName == null || countryName == "" ) {
    bodyStatefulRepresentation.internalState = 'error';             // displaying error UI state
} else {
    fetchCountryData( countryName )             // fetch country data
    .then( function( data ) {
        if ( data != 'error' ) {
            countryData = data;

            updatePageWithCountryData();            // update page with data

            // change the body's UI state do loaded-data
            bodyStatefulRepresentation.internalState = 'data';
        } else {   
            bodyStatefulRepresentation.internalState = 'error';
        }
    })
    .catch( function() {
        bodyStatefulRepresentation.internalState = 'error';
    })
}