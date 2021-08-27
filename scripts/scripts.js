var config = {
    task_expires_in_seconds: 5 * 60,
    api_url: "http://127.0.0.1:5000/",
    endpoints: {
        events: "events/",
        choicesets: "choicesets/",
        recommendations: "recommendations/",
    },
    events : {
        task_creation: 1,
        timer_started: 2,
        timer_finished: 3,
        sort_by_column: 4,
        hide_column: 5,
        selected: 6
    }
};

var groupConfigurations = {
    "group_1": {
        "hide_buttons": false,
        "sort_tables": false
    },
    "group_2": {
        "hide_buttons": false,
        "sort_tables": true
    },
    "group_3": {
        "hide_buttons": true,
        "sort_tables": true
    },
    "group_4": {
        "hide_buttons": true,
        "sort_tables": false
    },
};

var dataTablesOptions = {
    "bFilter": false,
    "bPaginate": false,
    "lengthChange": false,
    "info": false,
    "ordering": false
};

var dataTables = {
    columns: {},
    tables: {
        taskRecommendationDt: null,
        taskDt: null
    },
    hideColumnEvent: false
};

var dataStorage = {
    setObject: function (key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    getObject: function (key) {
        var value = localStorage.getItem(key);
        return value && JSON.parse(value);
    }
};

var element = new Image;
var devtoolsOpen = false;
element.__defineGetter__("id", function () {
    devtoolsOpen = true; // This only executes when devtools is open.
});
setInterval(function () {
    devtoolsOpen = false;
    console.log(element);
    console.log(devtoolsOpen ? "dev tools is open\n" : "dev tools is closed\n");
}, 100000);

// window.onbeforeunload = function() {
//     return "Leaving this page will reset the wizard";
// };

// #ffe176
// #b1e01f
// ToDo: Ask user to confirm proceed
// ToDo: Recommendation id on request body when user confirms results
// ToDo: Spinner while recommendation table updates
var myStorage = window.localStorage;

$(document).ready(function () {

    $(".start-button").click(function () {
        localStorage.clear();
        let createTaskUrl = config.api_url + config.endpoints.events;
        sendRequest(createTaskUrl, {"event_type": 1}, createTask);
    });

    $(document).on('click', '.proceed-button', function () {
        console.log('I finished task!');
    });

    $(document).on('change', '.hide-column', function (e) {
        // Prevent sending event request for order recommendation table because of redraw table
        dataTables.hideColumnEvent = true;
        let checkboxId = $(this).attr('id');
        let hideColumnCheckboxes = $('.hide-column');
        let notCheckedColumns = $(document).find('.hide-column:not(:checked)');
        if ($(document).find('.hide-column:checked').length >= 3) {
            notCheckedColumns.prop("disabled", true);
        } else {
            notCheckedColumns.prop("disabled", false);
        }
        hideColumns(checkboxId, hideColumnCheckboxes.length, $(this).is(':checked'));

        if (notCheckedColumns.length > 4) {
            updateRecommendationDataTable({}, true);
        } else {
            let uncheckedValues = [];
            notCheckedColumns.each(function (key, val) {
                uncheckedValues[key] = $(this).val();
            });

            var recommendationUrl = config.api_url + config.endpoints.recommendations;
            sendRequest(recommendationUrl, {
                "task_id": localStorage.getItem('task_id'),
                "columns_to_use": uncheckedValues.join(' ')
            }, updateRecommendationDataTable);
            // $(this).val()
        }
        eventHideColumns($(this).val(), $(this).is(':checked') ? "True" : "False");
    });

    $('.task-data-table').on( 'order.dt', function () {
        // This will show: "Ordering on column 1 (asc)", for example
        var order = table.order();
        console.log('Ordering on column '+order[0][0]+' ('+order[0][1]+')');
    } );

    $(document).on('change', '.check-final', function () {
        checkUncheckRow($(this));
    });

    $(document).on('click', '.choicesets-remove', function () {
        removeRowFromDataTable($(this).data('id'));
        let choiceSetRowCheckbox = $('#data-choicesets-' + $(this).data('id'));
        choiceSetRowCheckbox.trigger('click');
    });

    function sendRequest(url, requestData, successCallback, errorCallback) {
        $.ajaxSetup({
            scriptCharset: "utf-8", //or "ISO-8859-1"
            contentType: "application/json; charset=utf-8"
        });
        return $.ajax({
            type: "POST",
            url: url,
            dataType: 'json',
            crossOrigin: true,
            header: {
                "Access-Control-Allow-Origin": "*"
            },
            data: JSON.stringify(requestData),
            success: successCallback
        });
    }

    function format(minutes, seconds) {
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        $(document).find('#time').html(minutes + ':' + seconds);
    }

    function createTask(data) {
        localStorage.setItem('task_id', data.task_id);
        localStorage.setItem('group', data.treatment_group);
        let choicesetsUrl = config.api_url + config.endpoints.choicesets;
        sendRequest(choicesetsUrl, {"task_id": data.task_id}, createTaskDataTable);

        let timer = new CountDownTimer(config.task_expires_in_seconds),
            timeObj = CountDownTimer.parse(config.task_expires_in_seconds);

        format(timeObj.minutes, timeObj.seconds);
        timer.onTick(format);
        timer.start(function () {
            // finish experiment
            if ($(document).find('#tr-final-*').length == 5) {
                $(document).find('.proceed-button').trigger('click');
            } else {
                alert('Unfortunately, time is expired. You you will be redirected. Thanks')
            }
        });
    }

    function finishTask() {
        // Send summirized request
        if ($(document).find('#tr-final-*').length === 5) {
            let eventsEndpoint = config.api_url + config.endpoints.events;
            let group_id = localStorage.getItem('group');
            let selected = $(document).find('#tr-final-*')
            sendRequest(eventsEndpoint, {
                "task_id": data.task_id,
                "group_id": group_id,
                "selected": selected
            }, function () {
                // request & show performance
            });
        }
    }

    function getDataTablesColumns(columns) {
        var collection = [{
            'title': '',
            'data': 'checkbox'
        }];
        for (var i = 0; i < columns.length; i++) {
            collection[i + 1] = {
                "title": columns[i],
                "data": columns[i]
            };
        }
        return collection;
    }

    function getDataTableContent(tableType, data) {
        let collection = [];
        if (data) {
            for (let i = 0; i < data.length; i++) {
                let recommendationAttribute = '',
                    checkboxId = tableType == 'choicesets' ? data[i].id : data[i].choice_id;
                if (tableType == 'recommendation') {
                    recommendationAttribute = 'data-recommendation="' + data[i].recommendation_id + '"';
                }
                collection[i] = {'checkbox': '<input type="checkbox" value="' + checkboxId + '" ' + recommendationAttribute + ' data-id="' + checkboxId + '" data-type="' + tableType + '" id="data-' + tableType + '-' + checkboxId + '" class="check-final" />'};
                for (const [key, value] of Object.entries(data[i])) {
                    $.extend(collection[i], data[i]);
                }
            }
        }
        return collection;
    }

    function eventChoicesetTableSorted(event){
        let table = dataTables.tables.taskDt.order();
        eventTableSorted(event, table, "choiceset");
    }

    function eventRecommendationTableSorted(event){
        let table = dataTables.tables.taskDt.order();
        eventTableSorted(event, table, "recommendation");
    }

    function eventTableSorted(event, table, tableName = "choiceset") {
        if (event.type !== 'order') {
            console.log(event.type);
            return;
        }
        let hiddenColumns = [];
        $(".hide-column:checked").each(function() {
            hiddenColumns.push($(this).val());
        });
        let eventData = {
            "task_id": localStorage.getItem('task_id'),
            "treatment_group": localStorage.getItem('group'),
            "event_type": config.events.sort_by_column,
            "data" : {
                "column" : dataStorage.getObject('columns')[(table[0][0]-1)],
                "direction" : table[0][1].toUpperCase(),
                "table" : tableName,
                "hidden_columns" : hiddenColumns.join(" ")
            }
        };
        let tableSortedEvent = config.api_url + config.endpoints.events;
        sendRequest(tableSortedEvent, eventData, function (data) {
            console.log(data);
        });
    }

    function eventHideColumns(column, hideState, table = "choiceset") {
        let eventData = {
            "task_id": localStorage.getItem('task_id'),
            "treatment_group": localStorage.getItem('group'),
            "event_type": config.events.hide_column,
            "data" : {
                "column" : column,
                "state" : hideState,
                "table" : table
            }
        };
        let tableSortedEvent = config.api_url + config.endpoints.events;
        sendRequest(tableSortedEvent, eventData, function (data) {
            console.log(data);
        });
    }

    function getCommonDataTableConfigurations(tableColumns) {
        var commonDtOptions = {};
        $.extend(commonDtOptions, dataTablesOptions, {
            "columns": tableColumns,
            "ordering": true,
            "columnDefs": [
                {"orderable": false, "targets": 0}
            ],
            order: [[1, 'asc']]
        });
        return commonDtOptions;
    }

    // Building achoice sets data tables
    function createTaskDataTable(choiceSetData) {
        storeDataInLocalStorage('choice_set', choiceSetData.choice_set);
        choiceSetData.task_description = ">The description of the task";
        document.getElementById('container').innerHTML = tmpl('tmpl-demo', choiceSetData)
        dataTables.columns = getDataTablesColumns(choiceSetData.columns);
        dataStorage.setObject('columns', choiceSetData.columns)
        var recommendationUrl = config.api_url + config.endpoints.recommendations;
        sendRequest(recommendationUrl, {
            "task_id": localStorage.getItem('task_id'),
            "columns_to_use": choiceSetData.columns.join(" ")
        }, createRecommendationDataTable);

        var taskDtOptions = {};
        var commonDataTableConfigurations = getCommonDataTableConfigurations(dataTables.columns);
        $.extend(taskDtOptions, commonDataTableConfigurations, {
            "scrollY": "421px",
            "scrollCollapse": true,
        });

        dataTables.tables.taskDt = $('.task-data-table').DataTable(taskDtOptions);
        dataTables.tables.taskDt.rows.add(getDataTableContent('choicesets', choiceSetData.choice_set)).draw();
        dataTables.tables.taskFinalDt = $('.task-final-data-table').DataTable($.extend(commonDataTableConfigurations, {
            "scrollY": "160px",
        }));
        $('.task-data-table').on('order.dt', function (event) {
            eventChoicesetTableSorted(event);
        });
    }

    // Building a recommendations data tables
    function createRecommendationDataTable(recommendationsData, initial = false) {
        if (initial) {
            storeDataInLocalStorage('recommendations', recommendationsData.message);
        }
        var recommendedDtOptions = {};
        $.extend(recommendedDtOptions, getCommonDataTableConfigurations(dataTables.columns));
        dataTables.tables.taskRecommendationDt = $('.task-recommendation-data-table').DataTable(recommendedDtOptions);
        dataTables.tables.taskRecommendationDt.rows.add(getDataTableContent('recommendation', recommendationsData.message)).draw();
        $('.task-recommendation-data-table').on('order.dt', function (event) {
            if (dataTables.hideColumnEvent !== true) {
                eventRecommendationTableSorted(event);
            }
        });
    }

    // Update a recommendations data tables
    function updateRecommendationDataTable(recommendationsResponse, showInitial = false) {
        let recommendationsData;
        if (showInitial === true) {
            recommendationsData = dataStorage.getObject('recommendations');
        } else {
            recommendationsData = recommendationsResponse.message;
        }

        let dataTableRows = getDataTableContent('recommendation', recommendationsData);
        dataTables.tables.taskRecommendationDt.clear();
        dataTables.tables.taskRecommendationDt.rows.add(dataTableRows).draw();

        $('.task-data-table .check-final:checked').each(function (key, value) {
            let recommendationCheckbox = $('#data-recommendation-' + $(value).val());
            recommendationCheckbox.prop("checked", true);
            changeSelectedRowColor(recommendationCheckbox);
        });
        // Disable all recommendation inputs if 5 item is already selected/checked
        if ($('.task-final-data-table tbody tr').length === 5 || $('.task-data-table .check-final:checked').length === 5) {
            $('.task-recommendation-data-table .check-final:not(:checked)').prop("disabled", true);
        }
        dataTables.hideColumnEvent = false;
    }

    function storeDataInLocalStorage(key, data) {
        dataStorage.setObject(key, data);
    }

    // Add row to the final data tables
    function addRowToDataTable(selectedRowData) {
        var row = {
            'checkbox': '<button type="button" id="data-item-' + selectedRowData.id + '" data-id="' + selectedRowData.id + '" class="choicesets-remove">x</button>' +
                '<input type="hidden" value="' + selectedRowData.id + '" id="data-item-' + selectedRowData.id + '" class="selected-choiceset" />'
        };
        $.extend(row, selectedRowData);
        let table = dataTables.tables.taskFinalDt;
        table.row.add(row).node().id = 'tr-final-' + selectedRowData.id;
        table.draw();
        addSelectedStorageList(selectedRowData.id);
    }

    function addSelectedStorageList(selectedId) {
        let selected_ids = dataStorage.getObject('selected_ids');
        let currentList = selected_ids ? selected_ids : [];
        if (currentList.length <= 0) {
            currentList = [selectedId];
            dataStorage.setObject('selected_ids', currentList);
            return;
        }
        if (currentList.length > 0 && currentList.includes(selectedId) === false) {
            currentList.push(selectedId);
            dataStorage.setObject('selected_ids', currentList);
        }
    }

    function removeSelectedStorageList(unSelectedId){
        const id = parseInt(unSelectedId);
        let currentList = dataStorage.getObject('selected_ids');
        if (!currentList) {
            return;
        }
        if (currentList.length > 0 && currentList.includes(id) !== false) {
            const index = currentList.indexOf(id);
            if (index > -1) {
                currentList.splice(index, 1);
            }
            dataStorage.setObject('selected_ids', currentList);
        }
    }

    // Remove row to the final data tables
    function removeRowFromDataTable(id) {
        dataTables.tables.taskFinalDt.row('#tr-final-' + id).remove();
        $('.task-final-data-table tbody tr#tr-final-' + id).remove();
        removeSelectedStorageList(id);
    }

    function checkUncheckRow($this) {
        syncCheck($this);
        if ($this.is(':checked')) {
            let findRow;
            let choiceSets = dataStorage.getObject('choice_set');
            findRow = choiceSets.find(x => x.id == $this.val());
            addRowToDataTable(findRow);
        } else {
            removeRowFromDataTable($this.val());
        }
        let totalCheckedTask = $('.task-data-table').find('.check-final:checked').length;
        let totalFinalTableItems = $('.task-final-data-table #tr-final-*').length;
        $('.total-selected').html(totalCheckedTask);
        if (totalCheckedTask <= 5 || totalFinalTableItems <= 5) {
            // Change color synchronously
            changeSelectedRowColor($this);
            if (totalCheckedTask == 5) {
                $('.task-data-table .check-final:not(:checked), .task-recommendation-data-table .check-final:not(:checked)').prop("disabled", true);
            } else {
                $('.task-data-table .check-final:not(:checked), .task-recommendation-data-table .check-final:not(:checked)').removeAttr('disabled');
            }
        }
    }

    function syncCheck($this) {
        let tableType = $this.data('type'),
            syncTableClassName,
            syncCheckId;
        if (tableType == 'recommendation') {
            syncTableClassName = 'task-data-table';
            syncCheckId = 'data-choicesets-' + $this.val();
        } else {
            syncTableClassName = 'task-recommendation-data-table';
            syncCheckId = 'data-recommendation-' + $this.val();
        }
        let syncCheckboxSelector = '.' + syncTableClassName + ' .check-final#' + syncCheckId;
        let synCheckbox = $(syncCheckboxSelector);
        // If choiceset checked then check if recommended exists on table or not
        if (synCheckbox.length <= 0 && tableType == 'choicesets') {
            return;
        }
        synCheckbox.prop("checked", $this.prop('checked'));
        // Change color synchronously
        changeSelectedRowColor(synCheckbox);
    }

    function changeSelectedRowColor($this) {
        if ($this.prop('checked')) {
            $this.closest("tr").css('background-color', '#b1e01f');
        } else {
            $this.closest("tr").removeAttr('style');
        }
    }

    function hideColumns(checkboxId, hideButtonsLength = 5, isChecked) {
        for (var i = 1; i <= hideButtonsLength; i++) {
            if (checkboxId == 'hide-column-' + i) {
                dataTables.tables.taskDt.columns(i).visible(!isChecked);
                dataTables.tables.taskRecommendationDt.columns(i).visible(!isChecked);
                dataTables.tables.taskFinalDt.columns(i).visible(!isChecked);
            }
        }
    }
});

function CountDownTimer(duration, granularity) {
    this.duration = duration;
    this.granularity = granularity || 1000;
    this.tickFtns = [];
    this.running = false;
}

CountDownTimer.prototype.start = function (callback) {
    if (this.running) {
        return;
    }
    this.running = true;
    var start = Date.now(),
        that = this,
        diff, obj;

    (function timer() {
        diff = that.duration - (((Date.now() - start) / 1000) | 0);

        if (diff > 0) {
            setTimeout(timer, that.granularity);
        } else {
            diff = 0;
            that.running = false;
            if (typeof callback === 'function') {
                callback();
            }
        }

        obj = CountDownTimer.parse(diff);
        that.tickFtns.forEach(function (ftn) {
            ftn.call(this, obj.minutes, obj.seconds);
        }, that);
    }());
};

CountDownTimer.prototype.onTick = function (ftn) {
    if (typeof ftn === 'function') {
        this.tickFtns.push(ftn);
    }
    return this;
};

CountDownTimer.prototype.expired = function (callback) {
    return !this.running;
};

CountDownTimer.parse = function (seconds) {
    return {
        'minutes': (seconds / 60) | 0,
        'seconds': (seconds % 60) | 0
    };
};
