const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReview)
  .post(
    authController.permitUser('user'),
    reviewController.setUserTourId,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.permitUser('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.permitUser('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
