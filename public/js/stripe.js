/* eslint-disable */
const stripe = Stripe(
  'pk_test_51LfMB8SIYCcMLFLbzyLCS1uYytA2CY5qdiXN0zmTy0BEhSnkjDwPDp0DnVWhq2D2LqapDconZRd4tgiHj0NcncbK00SkMFvwB0'
);

const bookTour = async (tourId) => {
  try {
    //1) Get Checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    //2)Create checkout form + charge credit card
    await stripe.redirectToCheckout({ sessionId: session.data.session.id });
  } catch (err) {
    console.log(err);
  }
};

const bookButton = document.getElementById('book-tour');

if (bookButton)
  bookButton.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...';
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
