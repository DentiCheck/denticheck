import { gql } from '@apollo/client';

export const GET_HOSPITALS = gql`
  query GetHospitals {
    hospitals {
      id
      name
      address
      phone
      description
      latitude
      longitude
      homepageUrl
    }
  }
`;

export const SEARCH_HOSPITALS = gql`
  query SearchHospitals($latitude: Float!, $longitude: Float!, $radius: Float, $page: Int, $size: Int) {
    searchHospitals(latitude: $latitude, longitude: $longitude, radius: $radius, page: $page, size: $size) {
      content {
        id
        name
        address
        phone
        description
        latitude
        longitude
        homepageUrl
      }
      pageInfo {
        currentPage
        totalPages
        totalElements
      }
    }
  }
`;
