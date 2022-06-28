/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Link, PagedResponseLinks } from "./Links";

/**
 * Defines a CalculatedProperty or 'column' for a Group. It is calculated for each element returned by the Group's query.
 * @export
 * @interface CalculatedProperty
 */
export interface CalculatedProperty {
  /**
   * The CalculatedProperty Id.
   * @type {string}
   * @memberof CalculatedProperty
   */
  id: string;
  /**
   * Name of the Property (OData v4 SimpleIdentifier).
   * @type {string}
   * @memberof CalculatedProperty
   */
  propertyName: string;
  /**
   * The type of the CalculatedProperty. One of 'Area', 'Length', 'Volume', 'BoundingBoxLongestEdgeLength', 'BoundingBoxIntermediateEdgeLength', 'BoundingBoxShortestEdgeLength', 'BoundingBoxDiagonalLength', 'BoundingBoxLongestFaceDiagonalLength', 'BoundingBoxIntermediateFaceDiagonalLength', 'BoundingBoxShortestFaceDiagonalLength'.
   * @type {string}
   * @memberof CalculatedProperty
   */
  type: string;
  /**
   * The quantity type of the CalculatedProperty. One of 'Area', 'Distance', 'Force', 'Mass', 'Monetary', 'Time', 'Volume, or 'Undefined'.
   * @type {string}
   * @memberof CalculatedProperty
   */
  quantityType: string;
  /**
   *
   * @type {CalculatedPropertyLinks}
   * @memberof CalculatedProperty
   */
  _links: CalculatedPropertyLinks;
}

/**
 * List of CalculatedProperties.
 * @export
 * @interface CalculatedPropertyCollection
 */
export interface CalculatedPropertyCollection {
  /**
   * List of CalculatedProperties.
   * @type {Array<CalculatedProperty>}
   * @memberof CalculatedPropertyCollection
   */
  properties: Array<CalculatedProperty>;
  /**
   *
   * @type {PagedResponseLinks}
   * @memberof CalculatedPropertyCollection
   */
  _links: PagedResponseLinks;
}

/**
 * Properties of the CalculatedProperty to be created.
 * @export
 * @interface CalculatedPropertyCreate
 */
export interface CalculatedPropertyCreate {
  /**
   * Name of the CalculatedProperty.
   * @type {string}
   * @memberof CalculatedPropertyCreate
   */
  propertyName: string;
  /**
   * The type of the CalculatedProperty. One of 'Area', 'Length', 'Volume', 'BoundingBoxLongestEdgeLength', 'BoundingBoxIntermediateEdgeLength', 'BoundingBoxShortestEdgeLength', 'BoundingBoxDiagonalLength', 'BoundingBoxLongestFaceDiagonalLength', 'BoundingBoxIntermediateFaceDiagonalLength', 'BoundingBoxShortestFaceDiagonalLength'.
   * @type {string}
   * @memberof CalculatedPropertyCreate
   */
  type: string;
}

/**
 *
 * @export
 * @interface CalculatedPropertyLinks
 */

export interface CalculatedPropertyLinks {
  /**
   *
   * @type {Link}
   * @memberof CalculatedPropertyLinks
   */
  imodel: Link;
  /**
   *
   * @type {Link}
   * @memberof CalculatedPropertyLinks
   */
  mapping: Link;
  /**
   *
   * @type {Link}
   * @memberof CalculatedPropertyLinks
   */
  group: Link;
}

/**
 * Container for a CalculatedProperty object.
 * @export
 * @interface CalculatedPropertySingle
 */
export interface CalculatedPropertySingle {
  /**
   *
   * @type {CalculatedProperty}
   * @memberof CalculatedPropertySingle
   */
  property: CalculatedProperty;
}

/**
 * Properties of the CalculatedProperty to be updated.
 * @export
 * @interface CalculatedPropertyUpdate
 */
export interface CalculatedPropertyUpdate {
  /**
   * Name of the CalculatedProperty.
   * @type {string}
   * @memberof CalculatedPropertyUpdate
   */
  propertyName?: string;
  /**
   * The type of the CalculatedProperty. One of 'Area', 'Length', 'Volume', 'BoundingBoxLongestEdgeLength', 'BoundingBoxIntermediateEdgeLength', 'BoundingBoxShortestEdgeLength', 'BoundingBoxDiagonalLength', 'BoundingBoxLongestFaceDiagonalLength', 'BoundingBoxIntermediateFaceDiagonalLength', 'BoundingBoxShortestFaceDiagonalLength'.
   * @type {string}
   * @memberof CalculatedPropertyUpdate
   */
  type?: string;
}
