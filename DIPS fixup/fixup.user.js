// ==UserScript==
// @name        DIPS fixup
// @namespace   http://www.sja.org.uk/wmids
// @description Fixup irritations in DIPS
// @include     https://dips.sja.org.uk/*
// @version     1
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// ==/UserScript==

// We don't require a separate context for jQuery, as without the @grant none, we will be in a sandbox.

var pathArray = window.location.href.split('/');

var baseURL = window.location.origin ? window.location.origin : window.location.protocol + "//" + window.location.host;

baseURL += '/' + pathArray[3] + '/';

var navHeight = 26;

if (window.top == window.self) {
    $(document).find('body')
        .append(
        '<div style="margin-top: 50px; position: absolute; bottom: 0; left: 0; height: '
        + navHeight.toString()
        + 'px; width:100%;" id="addednav">&nbsp</div>'
    );
} else {

    var ournav = $(window.top.document).find('#addednav');
    $(ournav).hide();

    // Add Buttons here to the nav

    if (window.location.href.match(/MessageMembers\.asp/)) {
        $(ournav).append('<button id="addcontact">Add Contact Details</button>');
        $(ournav).find('#addcontact').click(function() {
            $('input[name^=member]').each(function() {
                var row = $(this).closest('tr');
                getMemberContact(this.value, function(data) {
                    row.find('td:last').append($('<div>').append(data.PhoneNumber));
                    row.find('td:eq(-2)').append($('<div>').append(data.eMailAddress));
                });
            });
        });
    }

    if ($(ournav).find("button")[0]) {
        $(ournav).show();
        $(ournav).closest('body').css('margin-bottom', (navHeight + 5).toString() + 'px');
    }

    $(window).unload(function() {
        $(ournav).find("button").remove();
        $(ournav).hide();
        $(ournav).closest('body').css('margin-bottom', '5px');
    });
}

function getMemberContact(id, callback) {
    return $.get(baseURL + 'membermanagement-edit.asp?type=edit&number=' + id, function(page) {
        var details = {};
        $('input', page).each(function() {
            details[this.name] = this.value;
        });

        callback(details);
    });
}
