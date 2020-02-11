composer = (function () {
    /*
     * Private
     */


    /*
     * _HTMLTemplates - {object}. This var store structured html blocks issued from html template selected
     */

    var _HTMLTemplates = {};

    /*
     * _activeHTMLTemplate - string. This var store template selected id
     */

    var _activeHTMLTemplate = "";

    /*
     * _blockTemplate - string. This var is used to construct elements and append it to dom with selected HTMLTemplate
     */

    var _blockTemplate = [
        '<div class="lyrow list-group-item">',
            '<span class="remove badge badge-danger">',
                '<i class="fas fa-times"></i> remove',
            '</span>',
            '<span class="preview">',
                '{{{preview}}}',
            '</span>',
            '<span class="drag badge badge-default">',
                '<i class="fas fa-arrows-alt"></i> drag',
            '</span>',
            '<div class="view">{{{view}}}</div>',
        '</div>'
        ].join("");

    /*
     * _selectTemplate - templateid. This method is used to update structure, style  and icons store derived from template
     */

    var _selectTemplate = function (m) {
        _activeHTMLTemplate = m;
        //Update structure elements choice in composer page
        $("#structure-models .list-group-item").remove();
        $("#structure-models").append(_HTMLTemplates[m].structure);
        //update style in wizard modal
        $("#wizard-result style").remove();
        $("#wizard-result").append(_HTMLTemplates[m].style);
        //update icon store in wizard modal
        $("#w_icon option").remove();
        if (_HTMLTemplates[m].parameters.icons) {
            var icon_options = [];
            var icons = _HTMLTemplates[m].parameters.icons.split(",");
            icons.forEach(function (i) {
                icon_options.push('<option value="'+i+'">'+i+'</option>');
            });
            $("#w_icon").append(icon_options.join(""));
        }


    }

    /*
     * _parseTemplate. This method is used to parse html template
     * and update composer ihm with result
     */


    var _parseTemplate = function (templateid, html) {
        var parameters = $(html).data(); /* eg data-icons, data-colors... */
        var page = $(html).find("template.report").get(0).content.firstElementChild;
        var style = $(html).find("style")[0];
        if (style) {
            style = style.outerHTML;
        }
        var colors = [];
        if (parameters.colors) {
            colors = parameters.colors.split(",");
        }
        var blocs = [];
        $(html).find("template.report-bloc, template.report-bloc-title").each(function (id, template) {
            var elem = $(template).prop('content').firstElementChild;
            var preview = elem.getAttribute("data-model-title");
            blocs.push({"view": elem.outerHTML, "preview": preview});
        });

        var structure = [];
        blocs.forEach(function(elem) {
            structure.push(_blockTemplate.replace("{{{view}}}", elem.view).replace("{{{preview}}}", elem.preview));
        });
        //Retrieve all dataviz models
        var dataviz_models = {};
        ["figure", "chart", "table", "title", "text", "iframe", "image", "map"].forEach(function(model) {
            var element = $(html).find("template.report-component.report-" + model).prop('content').firstElementChild;
            dataviz_models[model] = $.trim(element.outerHTML);
        });
        _HTMLTemplates[templateid] = {parameters: parameters, style: style, page: page, blocs: blocs, structure: structure, dataviz_models: dataviz_models, colors: colors};
        $("#selectedModelComposer").append('<option value="'+templateid+'">'+templateid+'</option>');

    };

    /*
     * _initComposer. This method initializes composer by loading html templates.
     */

    var _initComposer = function () {
        //TODO use config file to load html templates instead of ["a","b"]
        ["a","b"].forEach(function(m) {
            $.ajax({
                url: "html/model-" + m + ".html",
                dataType: "text",
                success: function(html) {
                    //Template parsing
                    _parseTemplate(m, html);

                },
                error: function(xhr, status, err) {
                    _alert("Erreur avec le fichier html/model-" + m + ".html " + err, "danger", true);
                }
            });
        });

        // configure #report-composition to accept drag & drop from structure elements
        new Sortable(document.getElementById("report-composition"), {
            handle: '.drag', // handle's class
            group:'structure',
            animation: 150,
            onAdd: function (/**Event*/evt) {
                _configureNewBlock(evt.item);
            }
        });

        // configure #structure-models to allow drag with clone option
        new Sortable(document.getElementById("structure-models"), {
            handle: '.drag', // handle's class
            dragClass: "sortable-drag",
            group: {
                name: 'structure',
                pull: 'clone',
                put: false // Do not allow items to be put into this list
            },
            animation: 150,
            sort: false // To disable sorting: set sort to false
        });

         // configure #dataviz-items to allow drag
        new Sortable(document.getElementById("dataviz-items"), {
            group:'dataviz',
            animation: 150
        });

        // save report button action
        $("#btn_save_report").click(function (e) {
            _saveReport();
        });

        $("#selectedReportComposer").change(function (e) {
            $("#report-composition .lyrow").remove();
            var reportId = $( this ).val();
            var title = admin.getReportData(reportId).title;
            $("#composer-report-title").text(reportId);
            //Update dataviz list
            var lst = [];
            var dataviz_lst = admin.getReportData(reportId).dataviz;
            dataviz_lst.forEach(function (dvz) {
                if (dvz != null)
                    lst.push(['<li data-dataviz="' + dvz + '" title="'+dvz+'" data-report="' + reportId + '" class="dataviz list-group-item">',
                    '<div class="tool"><button class="btn btn-default" data-toggle="modal" data-related-id="'+dvz+'" ',
                    'data-target="#wizard-panel"><i class="fas fa-cog"></i></button></div>',
                    '<span>' + dvz + '</span></div><code></code>'].join(""));
            });
            $("#dataviz-items .dataviz.list-group-item").remove();
            $("#dataviz-items").append(lst.join(""));
        });

        $("#selectedModelComposer").change(function (e) {
            _selectTemplate($( this ).val());
        });

        $('#text-edit').on('show.bs.modal', _onTextEdit);

    };

    var _onTextEdit = function(a) {
        //Get selected text element
        var source = a.relatedTarget.parentNode.firstChild;
        //store old text
        var oldtext = source.nodeValue;
        $("#text-edit-value").val(oldtext);
        //Get save button and remove existing handlers
        var btn = $(a.currentTarget).find(".text-save").off( "click");
        //Add new handler to save button
        $(btn).click(function(e) {
            //get new text value and store it in composition
            var text = $("#text-edit-value").val();
            //get type content (text or html)
            var type = $('#text-edit input[name=typeedit]:checked').val();
            if (type === "text") {
                source.nodeValue = text;
            }
            //close modal
            $("#text-edit").modal("hide");
        });

    };

    /*
     * _configureNewBlock. This method configure fresh dropped blocks to be able to receive and configure dataviz.
     */

    var _configureNewBlock = function(row) {
        $(row).find(".dataviz-container").each(function(id, col) {
            new Sortable(col, {
                group:'dataviz',
                animation: 150,
                onAdd: function (/**Event*/evt) {
                    //Test if title component
                    var test_title = $(evt.item).closest(".dataviz-container").parent().hasClass("report-bloc-title");
                    if (test_title) {
                        //No wizard needed
                        var dataviz = $(evt.item).closest(".dataviz").attr("data-dataviz");
                        var elem = $.parseHTML(composer.activeModel().dataviz_models.title.replace("{{dataviz}}", dataviz));
                        var definition = elem[0].outerHTML;
                        // Inject dataviz definition directy
                        $(evt.item).find("code").text(definition);
                        //Set title icon & deactivate wizard button
                        var btn = $(evt.item).find (".tool button");
                        $(btn).removeAttr("data-target").removeAttr("data-toggle");
                        $(btn).find("i").get( 0 ).className = "far fa-comment-dots";
                    }
                }
            });
        });
        //enable remove buton
        $(row).find(".remove").click(function(e) {
            //keep existing dataviz
            $(e.currentTarget).closest(".lyrow").find(".dataviz").appendTo("#dataviz-items");
            $(e.currentTarget).closest(".lyrow").remove();
        });
        // add edit button near to editable text elements
        var btn = $(row).find(".editable-text").append('<span data-toggle="modal" data-target="#text-edit" class="to-remove text-edit badge badge-warning"><i class="fas fa-edit"></i> edit</span>').find(".text-edit");

    };

    //This method is used to convert composer composition into valid html ready to use in mreport
    var _exportHTML = function () {
        var html = [];
        // Get first title
        $("#report-composition .report-bloc-title").each(function(id,title) {
            if (id === 0) {
                var dvz = $(title).find("code").text();
                html.push(dvz);
            }
        });
        //get blocs with their dataviz configuration
        $("#report-composition .report-bloc").each(function(id,bloc) {
            var tmp_bloc = $(bloc).clone();
            //delete extra row attributes
            ["data-model-title","data-model-description"].forEach(function(attr) {
                $(tmp_bloc).removeAttr(attr);
            });
            //delete extra controls
            $(tmp_bloc).find(".to-remove").remove();
            // loop on dataviz-container
            $(tmp_bloc).find(".dataviz-container").each(function(id,container) {
               var dvz = $(container).find("code").text();
               $(container).html(dvz);
            });
            html.push($(tmp_bloc).get(0).outerHTML);
        });

        // Get template style and inject it in html
        if (composer.activeModel().style) {
            html.push(composer.activeModel().style);
        }

        //generate html definition from template and composer elements
        var _page = $(_HTMLTemplates[_activeHTMLTemplate].page).clone();
        var _export = _page.find(".report").append(html.join("\n")).parent().get(0).outerHTML;

        return _export;
    };

    //_compose. This method is used to activate composer for a given report
    var _compose = function (reportId) {
        //Show composeur page
        $("#btn-composer").click();
        //Set report select value
        $('#selectedReportComposer option[value="' + reportId + '"]').prop('selected', true).trigger("change");
    }

    //Save report in report.html
    var _saveReport = function () {
		var _report = $("#selectedReportComposer").val();
		var newDom = _exportHTML();
        console.log(newDom);
		$.ajax({
            type: "POST",
            url: [_api_url, "report_html", _report].join("/"),
            data: newDom,
            dataType: 'json',
            contentType: 'text/html',
            success: function( response ) {
				if (response.response === "success") {
					console.log("Sauvegarde réussie");
				} else {
					alert("enregistrement échec :" + response.response)
				}

			},
			error: function( a, b, c) {
				console.log(a, b, c);
			}
		});


	};


    return {
        initComposer: _initComposer,
        exportHTML: _exportHTML,
        compose: _compose,
        colors: function () { return _HTMLTemplates[_activeHTMLTemplate].colors;},
        activeModel: function () { return _HTMLTemplates[_activeHTMLTemplate];},
        models: function () { return _HTMLTemplates;}
    }; // fin return

})();

$(document).ready(function () {
    composer.initComposer();
    wizard.init();
});