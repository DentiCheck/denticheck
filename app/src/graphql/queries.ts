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
