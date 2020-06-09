$(document).ready(function() {
    const state = {
        products: [],
        productTable: '',
        updateProductForm: {},
        deleteId: ''
    };

    loading.open();

    // loadtable();
    setTimeout(() => {
        $.get({ url: '/product', async: false })
            .done(result => {
                state.products = result;
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
        state.productTable = $('#product-table').DataTable({
            destroy: true,
            data: state.products,
            dom: 'rtip',
            scrollX: true,
            autoWidth: true,
            columns: [
                //
                { data: 'image', title: 'Image', width: 60 },
                { data: 'productNo', title: 'Product #' },
                { data: 'productTitle', title: 'Product Name' },
                { data: 'productDescription', title: 'Description' },
                { data: 'isPrescriptionNeeded', title: 'Prescription Required' },
                { data: 'price', title: 'Price', width: 50 },
                { data: 'stock', title: 'Stock', width: 50 },

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
                    targets: [0, 7],
                    className: 'dt-center'
                },
                {
                    targets: [0],
                    render: (data, type, row, meta) => `<img src="../${data}?${Date.now()}" alt="${row.productTitle}" class="rounded" width="50" height="50">`
                },
                {
                    targets: [4],
                    render: (data, type, row, meta) => (data ? '<span class="text-success font-weight-bolder">Yes</span>' : '<span class="text-danger font-weight-bolder">No</span>')
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
                        state.updateProductForm = data;
                        updateMode();
                    });

                $(row)
                    .find('.delete-btn')
                    .off('click')
                    .on('click', function() {
                        if (confirm(`Are you sure you want to delete ${data.productTitle}`)) {
                            state.deleteId = data._id;
                            deleteProduct();
                        }
                    });
            }
        });
    }

    function updateMode() {
        $('#table-card').hide();
        $('#edit-card').show();

        const { productTitle, productDescription, price, stock, image, isPrescriptionNeeded } = state.updateProductForm;

        $('#edit-card [name="productTitle"]').val(productTitle);
        $('#edit-card [name="productDescription"]').val(productDescription);
        $('#edit-card [name="price"]').val(price);
        $('#edit-card [name="stock"]').val(stock);
        $('#edit-card .custom-file-label').html(image.replace('images/products/', ''));
        $('#edit-card .isPrescriptionNeeded').prop('checked', isPrescriptionNeeded || false);
    }

    function deleteProduct() {
        const { deleteId: id } = state;
        loading.open();

        setTimeout(() => {
            $.ajax({ method: 'DELETE', url: `/product/${id}`, async: false })
                .done(result => {
                    successAlert('Product successfully deleted.');

                    state.productTable
                        .row(`#${id}`)
                        .remove()
                        .draw();

                    state.products = state.productTable
                        .rows()
                        .data()
                        .toArray();

                    loading.close();
                })
                .fail((xhr, status, error) => {
                    if (xhr.status == 404) {
                        alert(xhr.responseText);
                        return;
                    }
                    alert('Something went wrong.');
                    console.log(xhr, status, error);
                });
        }, 500);
    }

    $('#filter-product').on('keyup', function() {
        state.productTable.search($(this).val()).draw();
    });

    $('.custom-file-input').on('change', function() {
        var fileName = $(this)
            .val()
            .split('\\')
            .pop();
        $(this)
            .siblings('.custom-file-label')
            .addClass('selected')
            .html(fileName);
    });

    $('#back-table-btn, #back-table-btn2').on('click', function() {
        $('#table-card').show();
        $('#edit-card').hide();
        $('#add-card').hide();
    });

    $('#update-product-btn').on('click', function() {
        const products = $('#update-product-form').serializeObject();
        let isValid = true;

        // blank validator
        for (const i in products) {
            if (!products[i]) {
                warningAlert($(`#edit-card [name="${i}"]`).attr('placeholder') + ' is required.');

                isValid = false;
                break;
            }
        }

        const isPrescriptionNeeded = $('#edit-card input.isPrescriptionNeeded').is(':checked');
        products.isPrescriptionNeeded = isPrescriptionNeeded;

        if (!isValid) return;

        loading.open();

        // blank image validators
        const id = state.updateProductForm._id;
        const image = $('#update-prod-file').get(0).files;
        let formData = new FormData();

        if (image.length !== 0) {
            formData.append('productImage', image[0], image[0].name);
            setTimeout(() => {
                $.post({ url: `/product/${id}/upload/image`, async: false, data: formData, processData: false, contentType: false })
                    .done(result => {
                        console.log('Done uploading.');
                    })
                    .fail((xhr, status, error) => {
                        if (xhr.status == 404) {
                            errorAlert(xhr.responseText);
                            return;
                        }
                        errorAlert('Something went wrong.');
                        console.log(xhr, status, error);
                    });
            }, 500);
        }

        setTimeout(() => {
            $.ajax({ method: 'PUT', url: `/product/${id}`, async: false, data: JSON.stringify(products), contentType: 'application/json' })
                .done(result => {
                    successAlert('Product successfully updated.');

                    const currentData = state.productTable.row(`#${id}`).data();
                    const newData = {
                        ...currentData,
                        ...products
                    };

                    $('#back-table-btn').click();

                    state.productTable
                        .row(`#${id}`)
                        .data(newData)
                        .invalidate()
                        .draw();

                    state.products = state.productTable
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

    $('#add-mode-btn').on('click', function() {
        $('#table-card').hide();
        $('#edit-card').hide();
        $('#add-card').show();

        $('#add-card input, #add-card textarea').val('');
        $('#add-card .custom-file-label').html('Choose file');
        $('#add-card .isPrescriptionNeeded').prop('checked', false);
    });

    $('#add-product-btn').on('click', function() {
        const products = $('#add-product-form').serializeObject();
        let isValid = true;

        // blank validator
        for (const i in products) {
            if (!products[i]) {
                warningAlert($(`#add-card [name="${i}"]`).attr('placeholder') + ' is required.');

                isValid = false;
                break;
            }
        }

        const isPrescriptionNeeded = $('#add-card input.isPrescriptionNeeded').is(':checked');
        products.isPrescriptionNeeded = isPrescriptionNeeded;

        if (!isValid) return;

        // blank image validators
        const image = $('#add-prod-file').get(0).files;

        if (image.length === 0) {
            warningAlert('Product image is required.');
            isValid = false;
        }

        if (!isValid) return;

        loading.open();

        let formData = new FormData();
        formData.append('productImage', image[0]);
        products.image = 'http://pharmexdm.com/data/uploads/2017/02/Medicine.png';

        let prodId, createdProd;

        setTimeout(() => {
            // create document
            $.post({ url: '/product', async: false, data: JSON.stringify(products), contentType: 'application/json' })
                .then(result => {
                    createdProd = result;
                    prodId = result._id;

                    // upload image to server
                    return $.post({ url: `/product/${result._id}/upload/image`, async: false, data: formData, processData: false, contentType: false });
                })
                .then(fileName => {
                    // update document image
                    createdProd.image = `images/products/${fileName}`;
                    return $.ajax({ method: 'PUT', url: `/product/${prodId}`, async: false, data: JSON.stringify({ image: `images/products/${fileName}` }), contentType: 'application/json' });
                })
                .then(result => {
                    successAlert('Product successfully created.');
                    $('#back-table-btn2').click();

                    state.productTable.row.add(createdProd).draw();

                    state.products = state.productTable
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
