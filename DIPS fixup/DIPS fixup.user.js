// ==UserScript==
// @name        DIPS fixup
// @namespace   http://example.org
// @description Fixup irritations in DIPS
// @include     https://dips.sja.org.uk/*
// @version     1
// @grant       none
// @require     http://code.jquery.com/jquery-2.1.1.min.js
// ==/UserScript==

// Extra scope so we have our own jQuery and don't interfere with any loaded
// by the page.

//alert('foo');

(function () {
    var $ = jQuery.noConflict(true),
        baseURL = document.URL.match(/^[\w:]*\/\/[\w.]*\/[\w.]*\//) [0],
        duty=document.URL.match(/duty=(\d+)/); duty = duty && duty[1]; // I should use a proper parser here
    
    // I like named functions to act as comments in source and stack traces. If you don't, bite me!
    function dummy_page_get_for_keepalive () { $.get(baseURL +'DivisionalRegister.asp'); } // .curry() not built-in
    
    if ( baseURL ) { window.setInterval(dummy_page_get_for_keepalive, 120000); }
    
    function SimplifyMasthead() {
        var title_bar = $('table tr:contains(Duty and Information Planning System) table');
        title_bar.removeAttr('height');
        title_bar.find('td').removeAttr('background');
        title_bar.find('img[alt="St John Ambulance - Company Logo"]').css('height',40);
    }
    SimplifyMasthead();
    
    //$('td:has(>a[href^=DutyInformation5-Show])').hide();
    
    function GetMemberContact(id,callback) {
        return $.get(baseURL + 'membermanagement-edit.asp?type=edit&number=' + id,function(page){
            var details = {};
            $('input',page).each(function(){details[this.name]=this.value;});
            callback.call(details,details); 
        });
    }
    
    function GetMemberDriving(id,callback) {
        return $.get(baseURL + 'MemberManagement-EditDrive.asp?type=edit&number=' + id,function(page){
            var summary="",details = {};
            $(':input',page).each(function(){
                var name=this.name,val=$(this).val();
                details[name]=val;
                name = {"Car":"C","Ambulance":"A","Minibus":"M" }[name];
                val = {1: "F", 2:"O", 3: "R" }[val];
                if ( name && val ) {
                    summary = summary + ' ' + name + '=' + val;
                }
            });
            //alert(JSON.stringify(details));
            callback.call(details,summary.trim()); 
        });
    }
    
    function GetMembersOnDuty(duty,callback) {
        return $.get(baseURL + 'MessageMembers.asp?duty=' + duty, function(page){
            var details = {};
            $('input[name^=member]',page).each(function(){
                var row=$(this).closest('tr');
                details[row.find('td:first').text().trim()] = this.value;
            });
            //alert(JSON.stringify(details));
            callback.call(details,details); 
        });
    }
    
    function GetCrews(duty,callback) { 
        $.get(baseURL + 'DutyInformation8-Show.asp?page=4&duty=' + duty, function(page) {
            var allocations = {};
            $('table:has(tr:first:contains(Call Sign)):first tr:gt(0)',page).each(function(){
                var row=$(this),
                    vehicle = row.find('td:eq(2)').text() + ' ' + row.find('td:first').text();
                row.find('td:gt(2)').each(function(){
                    var crew_match = $(this).text().match(/(\S.*?)\s*\((.*)\)\s*$/);
                    if (crew_match) {
                        allocations[crew_match[1]]=crew_match[2] + ' ' + vehicle;
                    }
                });
            });
            callback.call(allocations,allocations);
        });
    }
    
    if (document.URL.match(/FindMemberCountyWide\.asp/)) {
        $('select[name=area] option[value=all]').attr('selected', 'selected');
        $('select[name=division]:not(:has(option[value=all]))').prepend('<option value=all>All</option>');
        $('input#firstname').focus();
        $('#findbutton').removeAttr('disabled').removeAttr('onclick'); // Simple submit please
    }
    
    // == Tampermonkey does not seem to call user script on the printout page ==
    function PrintDutySheet () {
        alert('PrintDutySheet');
        //$('body').prepend('<h1>Hello!');
    }
    
    if (document.URL.match(/PrintDutySheet\.asp/)) { PrintDutySheet(); }
    
    function DutyInformation4Show() {
        // Wow this is ugly!
        var lead_names_table=$('tr:has(td[colspan=25]:contains(Lead Officers))+tr table');
        function AddLeadNamesContact() {
            GetMembersOnDuty(duty,function(ids){
                lead_names_table.find('tr:gt(0)').each(function(){
                    // Note there are additional rows in this table but I'm going to assume they won't be found in ids[]
                    var row=$(this),id=ids[row.find('td:first').text().trim() + ' ' + row.find('td:eq(1)').text().trim()];
                    if(id){
                        GetMemberContact(id,function(){
                            row.find('td:eq(-2)').empty().append(this.PhoneNumber);
                            row.find('td:last').empty().append(this.eMailAddress);
                        });
                    }
                });
            });
        }
        lead_names_table.find('tr:first td:gt(-3)').click(AddLeadNamesContact);
    }
    
    if (document.URL.match(/DutyInformation4-Show\.asp/)) { DutyInformation4Show(); }
    
    
    function Support_documents_and_operation_hours() {
        $('table table td.normal:first, td.keyline').hide(); // Remove clutter
        // Make 'Show all pre-booked menbers' more visible
        $('input[type=button]:first').before($("input[type=button][value*='Show all pre']")).attr('value', '[+]').css('width', '40px');
    }
    
    if (document.URL.match(/DutyInformation5-Show\.asp/)) { Support_documents_and_operation_hours(); }
    
    function CountMeInService () {
        function NameFromRow(row) {
            return row.find('td:first').text().trim() +' ' + 
                row.find('td:eq(1)').contents().filter(function() { return this.nodeType === 3; }).text().trim();
        }
        function ReplaceAllocations(allocations) {
            $('tr[onclick^=SM]').each(function(){
                var row=$(this), allocation=allocations[NameFromRow(row)];
                if (allocation) {
                    row.find('td:eq(2)').empty().append(allocation);
                }
            });
        }
        function AugmentListing() {
            GetCrews(duty,ReplaceAllocations);
            
            GetMembersOnDuty(duty,function(ids){
                $('tr[onclick^=SM]').each(function(){
                    var row=$(this), id=ids[NameFromRow(row)];
                    if ( id ) {
                        GetMemberDriving(id,function(driving){
                            row.find('td:eq(3)').append(' (' + driving + ')');
                        });
                    }
                });
            });
        }
        $('td[colspan=8].keyline:contains(Members currently booked)').click(AugmentListing);
    }
    
    if (document.URL.match(/CountMeInService\.asp\?show=all/)) { CountMeInService(); }
    
    function MessageMembers() {
        function InsertContactDetails() {
            $('input[name^=member]').each(function(){
                var row=$(this).closest('tr');	
                GetMemberContact(this.value, function(){
                    row.find('td:last').append($('<div>').append(this.PhoneNumber));
                    row.find('td:eq(-2)').append($('<div>').append(this.eMailAddress));
                });
            });
        }
        $('td:last-child:not(:has(table)):contains(Communication):first').click(InsertContactDetails);       
    }
    
    if (document.URL.match(/MessageMembers\.asp/)) { MessageMembers(); }
    
    function DutySystemList() {    
        var page_links,duty_list_table,key_table,colour_filter_cells,top_row,bottom_row,
            prior_page_link, prior_group_link, next_page_link;
        
        
        function append_days_to_pages() {
            var dates;
            
            page_links.find('font:has(b)').attr('color','maroon'); // So we can see it was clicked.
            function d (n) {
                return dates.get(n).textContent.match(/[1-9][0-9]*/) [0];
            }
            // Get the 1,2,...n page links as jQuery objects
            $.each($('a', page_links).not(':contains(Page)').get(), function (index, link) {
                $.get(link.href, function (page) {
                    dates = $('td[title=\'Show this just this date\'] b', page);
                    $(link).append(' (' + d(0) + '-' + d( - 1) + ')');
                });
            });
        }
        
        (page_links = $('table:first table:first tr:first td:first')).find('font:has(b)').one('click',append_days_to_pages);
        
        function colour_filter_cells_click(){
            var color = $(this).css("backgroundColor"),
                rows = duty_list_table.find('td:first-child').filter(function(){ return color == $(this).css("backgroundColor");}).parent();
            if ( $(this).text() === "" ) {
                $(this).append(" X");
                rows.show();
            } else {
                $(this).empty();
                rows.hide();
            }
        }
        
        
        // Compact the existing filtering options currently 3 tables into one line
        $('form>table:first input[type=submit]').attr('value', '<< Hide cancelled');
        $('form>table').filter(function () {
            $(this).before($(this).find('td').children()).hide().parent().css('display', 'inline');
        });
        
        duty_list_table = $('table.normal:first');
        duty_list_table.find('tr>td[colspan=6]').parent().remove(); // Remove the redundant "Event Information / Details" caption row
        
        // "Key colour information on this DIPS Events Listing Display" hidden until clicked
        key_table = $('table:last');
        
        function make_key_table_toggle() {
            var parent = key_table.parent(); // The <font> element that contains the key_table
            key_table.detach(); // Remove the table itself from the parent
            parent.find('br').remove(); // Ugly blank lines
            // Wrap the contents in a span so it can have its own clink handler
            parent.prepend($('<span></span>').append(parent.contents().detach()).click(function () { key_table.toggle(); }));
            parent.append(key_table.hide()); // But the table back, but hidden 
        }
        
        make_key_table_toggle();
        
        // The boxes work as filters by the colours on the left
        colour_filter_cells = key_table.find("td:first-child").empty().append(" X");
        colour_filter_cells.click(colour_filter_cells_click);
        
        function get_prior_links(page) {
            prior_page_link = $('table[bordercolor="#ffffff"]:first a:contains(Last)',page).attr('href');
            prior_group_link = $('table.normal:first tr:first a:contains(Last)',page).attr('href');
        }
        
        function get_next_links(page) {
            next_page_link = $('table[bordercolor="#ffffff"]:first a:contains(Next)',page).attr('href') ||
                $('table.normal:first tr:first a:contains(Next)',page).attr('href');
        }
        
        get_prior_links(document);
        get_next_links(document);
        
        function remove_old_style_navigation() {
            // Need to figure out how to get rid of "DIPS Note: You have been taken to page..."
            top_row.click(top_row_click);
            bottom_row.click(bottom_row_click);
            // $(this).parent().click(); this not required in Chrome but I would not rely on it!
            top_row.add(bottom_row).find('td').empty(); // << Show Last Months Duties    Events Between: 01/10/2014 and 31/10/2014    Show Next Months Duties >>
            $('table:first table:first, table:first td>table:last').hide(); // The top and bottom navigation menu
        }
        
        function remove_duplicate_day_banners() {
            var prior_caption;
            duty_list_table.find("tr:has(td[colspan=15])").each(function(){
                var row=$(this),
                    caption = row.text();
                if ( caption === prior_caption) {
                    row.add(row.next()).remove();
                }
                prior_caption = caption;
            });
        }
        
        function top_row_click() {
            function got_page (page){
                page=$(page);
                get_prior_links(page);
                top_row.after($('table.normal:first tr:gt(1):lt(-1)',page));
                remove_duplicate_day_banners();
            }
            if ( prior_page_link ) {
                $.get(prior_page_link,got_page);
            } else {
                // We have reached the first page of this group
                $.get(prior_group_link,function(page){
                    page=$(page);
                    // Note: "last" means "last" not "prior" as the authors of DIPS seem to imagine
                    var last_page_link = $('table[bordercolor="#ffffff"]:first a:has(~a:contains(Next)):last',page).attr('href');
                    if ( last_page_link ) {
                        // The prior group contained multiple pages
                        $.get(last_page_link,got_page);
                    } else {
                        // The prior group contained only one page
                        got_page(page);
                    }                    
                });
            }
        }
        
        function bottom_row_click() {
            $.get(next_page_link,function(page){
                page=$(page);
                get_next_links(page);
                bottom_row.before($('table.normal:first tr:gt(1):lt(-1)',page));
                remove_duplicate_day_banners();
            });
        }
        
        top_row = duty_list_table.find('tr:first');
        bottom_row = duty_list_table.find('tr:last');
        top_row.add(bottom_row).each(function() {
            var td = $(this).find('td');
            td.attr('colspan',td.attr('colspan')-1).before($('<td>+</td>').one('click',remove_old_style_navigation));
        });
        
    }
    
    if (document.URL.match(/DutySystem-List\w*\.asp/)) { DutySystemList(); }
    
}());