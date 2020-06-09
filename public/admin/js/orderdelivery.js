$(document).ready(function() {
    const state = {
        orders: [],
        orderTable: '',
        orderDetail: {},
        productTable: ''
    };

    loading.open();

    setTimeout(() => {
        $.get({ url: '/order/status/for delivery', async: false })
            .done(result => {
                state.orders = result;
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
        state.orderTable = $('#order-table').DataTable({
            destroy: true,
            data: state.orders,
            dom: 'rtip',
            scrollX: true,
            columns: [
                //
                { data: 'orderNo', title: 'Order #', width: 100 },
                { data: 'customer.customerNo', title: 'Customer #', width: 100 },
                { data: 'customer.firstName', title: 'Customer Name' },
                { data: 'orderCount', title: 'No. of Orders', width: 100 },
                { data: 'dateCreated', title: 'Date Ordered' },

                {
                    data: null,
                    title: 'Action',
                    width: 60,
                    render: (data, type, row, meta) => {
                        return `<button class="btn btn-sm btn-pill btn-info active delivered-btn" type="button" aria-pressed="true"><i class="fa fa-check-square-o" aria-hidden="true"></i></button>
                        <button class="btn btn-sm btn-pill btn-info active detail-btn" type="button" aria-pressed="true"><i class="fa fa-th-list" aria-hidden="true"></i></button>`;
                    }
                }
            ],

            columnDefs: [
                {
                    targets: [2],
                    render: (data, type, row, meta) => `${row.customer.firstName} ${row.customer.lastName}`
                },
                {
                    targets: [4],
                    render: (data, type, row, meta) => (data ? moment(data).format('YYYY-MMM-DD') : '<span class="text-danger font-weight-bolder">X</span>')
                },
                {
                    targets: [5],
                    className: 'dt-center'
                },
                {
                    targets: '_all',
                    render: (data, type, row, meta) => data || '<span class="text-danger font-weight-bolder">X</span>'
                }
            ],

            rowCallback: (row, data, iDataIndex) => {
                $(row).attr('id', data._id);

                $(row)
                    .find('.detail-btn')
                    .on('click', function() {
                        state.orderDetail = data;
                        detailMode();
                    });

                $(row)
                    .find('.delivered-btn')
                    .off('click')
                    .on('click', function() {
                        if (confirm(`Are you sure that ${data.orderNo} is delivered`)) {
                            state.orderDetail = data;

                            $('#approve-order-btn').click();
                        }
                    });
            }
        });
    }

    function detailMode() {
        $('#table-card').hide();
        $('.detail-card').show();

        const {
            orders,
            orderNo,
            orderCount,
            total,
            dateCreated,
            address,
            payment,
            customer: { customerNo, firstName, lastName },
            imageFrom
        } = state.orderDetail;

        $('.detail-card .detail-orderNo').html(orderNo);
        $('.detail-card .detail-customerNo').html(customerNo);
        $('.detail-card .detail-customerName').html(`${firstName} ${lastName}`);
        $('.detail-card .detail-address').html(address);
        $('.detail-card .detail-payment').html(payment);
        $('.detail-card .detail-orderCount').html(orderCount);
        $('.detail-card .detail-dateCreated').html(moment(dateCreated).format('YYYY-MMM-DD'));

        $('.detail-card #total-amount').html(`Total : ₱ ${numWithCommas(total.toFixed(2))}`);

        state.productTable = $('#product-table').DataTable({
            destroy: true,
            data: orders,
            dom: 'rtip',
            scrollX: true,
            autoWidth: false,
            columns: [
                //
                { data: 'product.image', title: 'Image' },
                { data: 'product.productNo', title: 'Product #' },
                { data: 'product.productTitle', title: 'Product Name' },
                { data: 'product.isPrescriptionNeeded', title: 'Prescription<br> Required' },
                { data: 'price', title: 'Price' },
                { data: 'quantity', title: 'Quantity' },
                { data: 'total', title: 'Total' }
            ],

            columnDefs: [
                {
                    targets: [0],
                    className: 'dt-center'
                },
                {
                    targets: [0],
                    render: (data, type, row, meta) => `<img src="../${data}?${Date.now()}" alt="${row.productTitle}" class="rounded" width="50" height="50">`
                },
                {
                    targets: [3],
                    render: (data, type, row, meta) => (data ? '<span class="text-success font-weight-bolder">Yes</span>' : '<span class="text-danger font-weight-bolder">No</span>')
                },
                {
                    targets: [4, 6],
                    render: (data, type, row, meta) => `₱ ${numWithCommas(data.toFixed(2))}`
                },
                {
                    targets: '_all',
                    className: 'dt-nowrap'
                }
            ]
        });

        if (imageFrom == 'camera') {
            $('#prescription-image').attr('style', 'transform: rotate(90deg) translateY(-100%); transform-origin:top left');
        } else {
            $('#prescription-image').removeAttr('style');
        }

        const image = state.orderDetail.prescriptionImage;
        $('#prescription-image').attr('src', `https://pharmakeia.herokuapp.com/${image}`);
    }

    $('#filter-order').on('keyup', function() {
        state.orderTable.search($(this).val()).draw();
    });

    $('#show-prescription-btn').on('click', function() {
        $('#prescriptionModal').modal();
    });

    $('#back-table-btn').on('click', function() {
        $('#table-card').show();
        $('.detail-card').hide();
    });

    $('#approve-order-btn').on('click', function() {
        const { _id: id, orderNo } = state.orderDetail;
        loading.open();

        setTimeout(() => {
            $.ajax({ method: 'PUT', url: `/order/${id}`, async: false, data: JSON.stringify({ status: 'received' }), contentType: 'application/json' })
                .done(result => {
                    successAlert(`${orderNo} is now delivered.`);
                    $('#back-table-btn').click();

                    state.orderTable
                        .row(`#${id}`)
                        .remove()
                        .draw();

                    state.orders = state.orderTable
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
