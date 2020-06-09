$(document).ready(function() {
    const state = {
        customers: [],
        customerTable: '',
        updateCustForm: {},
        deleteId: ''
    };

    loading.open();

    setTimeout(() => {
        $.get({ url: `/customer`, async: false })
            .done(result => {
                state.customers = result;
                loadtable();
                loading.close();
            })
            .fail((xhr, status, error) => {
                loading.close();

                errorAlert('Something went wrong');
                console.log(xhr, status, error);
            });
    }, 500);

    function loadtable() {
        $.fn.dataTable.moment('YYYY-MMM-DD');
        state.customerTable = $('#customer-table').DataTable({
            destroy: true,
            data: state.customers,
            dom: 'rtip',
            scrollX: true,
            columns: [
                //
                { data: 'customerNo', title: 'Customer #' },
                { data: 'firstName', title: 'Customer name' },
                { data: 'email', title: 'Email' },
                { data: 'contactNo', title: 'Contact #' },
                { data: 'address', title: 'Address' },
                { data: 'birthdate', title: 'Birth date' },
                {
                    data: null,
                    title: 'Action',
                    render: (data, type, row, meta) => {
                        return `<button class="btn btn-sm btn-pill btn-info active edit-btn" type="button" aria-pressed="true"><i class="fa fa-pencil" aria-hidden="true"></i></button>
                        <button class="btn btn-sm btn-pill btn-info active delete-btn" type="button" aria-pressed="true"><i class="fa fa-trash" aria-hidden="true"></i></button>`;
                    }
                }
            ],

            columnDefs: [
                {
                    targets: [6],
                    className: 'dt-center'
                },
                {
                    targets: [1],
                    render: (data, type, row, meta) => `${row.firstName} ${row.lastName}`
                },
                {
                    targets: [5],
                    render: (data, type, row, meta) => (data ? moment(data).format('YYYY-MMM-DD') : '<span class="text-danger font-weight-bolder">X</span>')
                },
                {
                    targets: '_all',
                    render: (data, type, row, meta) => data || '<span class="text-danger font-weight-bolder">X</span>'
                }
            ],

            rowCallback: (row, data, iDataIndex) => {
                $(row).attr('id', data._id);

                $(row)
                    .find('.edit-btn')
                    .on('click', function() {
                        state.updateCustForm = data;
                        updateMode();
                    });

                $(row)
                    .find('.delete-btn')
                    .off('click')
                    .on('click', function() {
                        if (confirm(`Are you sure you want to delete ${data.firstName} ${data.lastName}`)) {
                            state.deleteId = data._id;
                            deleteCustomer();
                            // state.customerTable
                            //             .rows()
                            //             .data()
                            //             .toArray()
                        }
                    });
            }
        });
    }

    function updateMode() {
        $('#table-card').hide();
        $('#edit-card').show();

        const { firstName, lastName, email, contactNo, address, birthdate } = state.updateCustForm;

        $(`input[name="firstName"]`).val(firstName);
        $(`input[name="lastName"]`).val(lastName);
        $(`input[name="email"]`).val(email);
        $(`input[name="contactNo"]`).val(contactNo);
        $(`input[name="address"]`).val(address);
        $(`input[name="birthdate"]`).val(birthdate ? moment(birthdate).format('MM/DD/YYYY') : '');

        $('input[name="birthdate"]').daterangepicker({
            singleDatePicker: true,
            showDropdowns: true,
            drops: 'up'
        });
    }

    function deleteCustomer() {
        const { deleteId: id } = state;
        loading.open();

        setTimeout(() => {
            $.ajax({ method: 'DELETE', url: `/customer/${id}`, async: false })
                .done(result => {
                    successAlert('Customer successfully deleted.');

                    state.customerTable
                        .row(`#${id}`)
                        .remove()
                        .draw();

                    state.customers = state.customerTable
                        .rows()
                        .data()
                        .toArray();

                    loading.close();
                })
                .fail((xhr, status, error) => {
                    loading.close();

                    if (xhr.status == 404) {
                        errorAlert(xhr.responseText);
                        return;
                    }
                    errorAlert('Something went wrong');
                    console.log(xhr, status, error);
                });
        }, 500);
    }

    $('#filter-customer').on('keyup', function() {
        state.customerTable.search($(this).val()).draw();
    });

    $('#back-table-btn').on('click', function() {
        $('#table-card').show();
        $('#edit-card').hide();
    });

    $('#update-customer-btn').on('click', function() {
        const customers = $('#update-customer-form').serializeObject();
        let isValid = true;

        // blank validator
        for (const i in customers) {
            if (!customers[i]) {
                warningAlert($(`input[name="${i}"]`).attr('placeholder') + ' is required.');

                isValid = false;
                break;
            }
        }

        if (!isValid) return;

        loading.open();

        setTimeout(() => {
            const id = state.updateCustForm._id;
            $.ajax({ method: 'PUT', url: `/customer/${id}`, async: false, data: JSON.stringify(customers), contentType: 'application/json' })
                .done(result => {
                    successAlert('Customer successfully updated.');

                    const currentData = state.customerTable.row(`#${id}`).data();
                    const newData = {
                        ...currentData,
                        ...customers,

                        birthdate: result.birthdate
                    };

                    $('#back-table-btn').click();

                    state.customerTable
                        .row(`#${id}`)
                        .data(newData)
                        .draw();

                    state.customers = state.customerTable
                        .rows()
                        .data()
                        .toArray();

                    loading.close();
                })
                .fail((xhr, status, error) => {
                    loading.close();

                    if (xhr.status == 404) {
                        errorAlert(xhr.responseText);
                        return;
                    }
                    errorAlert('Something went wrong');
                    console.log(xhr, status, error);
                });
        }, 500);
    });
});
