$(document).ready(function() {
    const state = {
        users: [],
        userTable: '',
        updateUserForm: {},
        deleteId: ''
    };

    loading.open();

    setTimeout(() => {
        $.get({ url: `/user`, async: false })
            .done(result => {
                state.users = result;
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
        state.userTable = $('#user-table').DataTable({
            destroy: true,
            data: state.users,
            dom: 'rtip',
            scrollX: true,
            columns: [
                //
                { data: 'firstName', title: 'User name' },
                { data: 'email', title: 'Email' },
                { data: 'position', title: 'Position' },
                { data: 'contactNo', title: 'Contact #' },
                { data: 'address', title: 'Address' },
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
                    targets: [5],
                    className: 'dt-center'
                },
                {
                    targets: [0],
                    render: (data, type, row, meta) => `${row.firstName} ${row.lastName}`
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
                        state.updateUserForm = data;
                        updateMode();
                    });

                $(row)
                    .find('.delete-btn')
                    .off('click')
                    .on('click', function() {
                        if (confirm(`Are you sure you want to delete ${data.firstName} ${data.lastName}`)) {
                            state.deleteId = data._id;
                            deleteUser();
                        }
                    });
            }
        });
    }

    function updateMode() {
        $('#table-card').hide();
        $('#edit-card').show();

        const { firstName, lastName, email, position, contactNo, address } = state.updateUserForm;

        $('#edit-card input[name="firstName"]').val(firstName);
        $('#edit-card input[name="lastName"]').val(lastName);
        $('#edit-card input[name="email"]').val(email);
        $('#edit-card input[name="position"]').val(position);
        $('#edit-card input[name="contactNo"]').val(contactNo);
        $('#edit-card input[name="address"]').val(address);
    }

    function deleteUser() {
        const { deleteId: id } = state;
        loading.open();

        setTimeout(() => {
            $.ajax({ method: 'DELETE', url: `/user/${id}`, async: false })
                .done(result => {
                    successAlert('User successfully deleted.');

                    state.userTable
                        .row(`#${id}`)
                        .remove()
                        .draw();

                    state.users = state.userTable
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

    $('#filter-user').on('keyup', function() {
        state.userTable.search($(this).val()).draw();
    });

    $('#back-table-btn, #back-table-btn2').on('click', function() {
        $('#table-card').show();
        $('#edit-card').hide();
        $('#add-card').hide();
    });

    $('#update-user-btn').on('click', function() {
        const users = $('#update-user-form').serializeObject();
        let isValid = true;

        // blank validator
        for (const i in users) {
            if (!users[i]) {
                warningAlert($(`#edit-card input[name="${i}"]`).attr('placeholder') + ' is required.');

                isValid = false;
                break;
            }
        }

        if (!isValid) return;

        loading.open();

        setTimeout(() => {
            const id = state.updateUserForm._id;
            $.ajax({ method: 'PUT', url: `/user/${id}`, async: false, data: JSON.stringify(users), contentType: 'application/json' })
                .done(result => {
                    successAlert('User successfully updated.');

                    const currentData = state.userTable.row(`#${id}`).data();
                    const newData = {
                        ...currentData,
                        ...users
                    };

                    $('#back-table-btn').click();

                    state.userTable
                        .row(`#${id}`)
                        .data(newData)
                        .draw();

                    state.users = state.userTable
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

    $('#add-mode-btn').on('click', function() {
        $('#table-card').hide();
        $('#edit-card').hide();
        $('#add-card').show();

        $('#add-card input').val('');
    });

    $('#add-user-btn').on('click', function() {
        const users = $('#add-user-form').serializeObject();
        let isValid = true;

        // blank validator
        for (const i in users) {
            if (!users[i]) {
                warningAlert($(`#add-card input[name="${i}"]`).attr('placeholder') + ' is required.');

                isValid = false;
                break;
            }
        }

        if (!isValid) return;

        loading.open();

        setTimeout(() => {
            users.password = 'pass123';
            $.post({ url: `/user`, async: false, data: JSON.stringify(users), contentType: 'application/json' })
                .done(result => {
                    successAlert('User successfully created.');
                    $('#back-table-btn2').click();

                    state.userTable.row.add(result).draw();

                    state.users = state.userTable
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
                    errorAlert('Something went wrong.');
                    console.log(xhr, status, error);
                });
        }, 500);
    });
});
