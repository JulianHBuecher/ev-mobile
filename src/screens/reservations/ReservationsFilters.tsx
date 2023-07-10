import React from 'react';

import ScreenFilters, { ScreenFiltersProps } from '../../components/search/filter/screen/ScreenFilters';
import FilterModalContainerComponent from '../../components/search/filter/containers/FilterModalContainerComponent';
import User from '../../types/User';
import SecuredStorage from '../../utils/SecuredStorage';
import { GlobalFilters } from '../../types/Filter';
import UserFilterComponent from '../../components/search/filter/controls/user/UserFilterComponent';
import DateFilterControlComponent from '../../components/search/filter/controls/date/DateFilterControlComponent';
import I18n from 'i18n-js';
import { View } from 'react-native';
import computeStyleSheet from './ReservationsFiltersStyles';

export interface Props extends ScreenFiltersProps<ReservationsFiltersDef> {
  reservationToDate?: Date;
  reservationFromDate?: Date;
  reservationExpiryDate?: Date;
}

export interface ReservationsFiltersDef {
  fromDateTime?: Date;
  toDateTime?: Date;
  expiryDateTime?: Date;
  users?: User[];
}

export default class ReservationsFilters extends ScreenFilters<ReservationsFiltersDef, Props> {
  protected async getInitialFilters(): Promise<{ visibleFilters: ReservationsFiltersDef; modalFilters: ReservationsFiltersDef }> {
    const fromDateTimeString = await SecuredStorage.loadFilterValue(
      this.centralServerProvider.getUserInfo(),
      GlobalFilters.RESERVATIONS_FROM_DATE_FILTER
    );
    const toDateTimeString = await SecuredStorage.loadFilterValue(
      this.centralServerProvider.getUserInfo(),
      GlobalFilters.RESERVATIONS_TO_DATE_FILTER
    );
    // const expiryDateTimeString = await SecuredStorage.loadFilterValue(
    //   this.centralServerProvider.getUserInfo(),
    //   GlobalFilters.RESERVATIONS_EXPIRY_DATE_FILTER
    // );
    const fromDateTime = fromDateTimeString ? new Date(fromDateTimeString as string) : null;
    const toDateTime = toDateTimeString ? new Date(toDateTimeString as string) : null;
    // const expiryDateTime = expiryDateTimeString ? new Date(expiryDateTimeString as string) : null;
    const initialFilters = {
      fromDateTime,
      toDateTime
    };
    return { visibleFilters: null, modalFilters: initialFilters };
  }

  public render() {
    const style = computeStyleSheet();
    const { filters, isAdmin, hasSiteAdmin } = this.state;
    const { reservationToDate, reservationFromDate, reservationExpiryDate } = this.props;
    const fromDateTime = filters?.fromDateTime;
    const toDateTime = filters?.toDateTime;
    return (
      <View>
        <FilterModalContainerComponent
          onFilterChanged={(newFilters) => this.onFiltersChanged(null, newFilters, true)}
          ref={(filterModalContainerComponent: FilterModalContainerComponent) =>
            this.setFilterModalContainerComponent(filterModalContainerComponent)
          }>
          {(isAdmin || hasSiteAdmin) && (
            <View>
              {this.securityProvider?.canListUsers() && (
                <UserFilterComponent
                  filterID={'users'}
                  initialValue={filters.users}
                  ref={(userFilterControlComponent: UserFilterComponent) => this.addModalFilter(userFilterControlComponent)}
                />
              )}
            </View>
          )}
          <View style={style.dateFiltersContainer}>
            <DateFilterControlComponent
              filterID={'fromDateTime'}
              style={style.dateFilterComponentContainer}
              internalFilterID={GlobalFilters.RESERVATIONS_FROM_DATE_FILTER}
              label={I18n.t('reservations.fromDate')}
              onFilterChanged={(id: string, newFromDateTime: Date) => this.onFiltersChanged(null, { fromDateTime: newFromDateTime })}
              ref={(dateFilterControlComponent: DateFilterControlComponent) => this.addModalFilter(dateFilterControlComponent)}
              locale={this.state.locale}
              minimumDate={reservationFromDate}
              initialValue={fromDateTime}
              defaultValue={reservationFromDate}
              maximumDate={toDateTime ?? reservationToDate}
            />
            <DateFilterControlComponent
              filterID={'toDateTime'}
              internalFilterID={GlobalFilters.RESERVATIONS_TO_DATE_FILTER}
              style={style.dateFilterComponentContainer}
              label={I18n.t('reservations.toDate')}
              onFilterChanged={(id: string, newToDateTime: Date) => this.onFiltersChanged(null, { toDateTime: newToDateTime })}
              ref={(dateFilterControlComponent: DateFilterControlComponent) => this.addModalFilter(dateFilterControlComponent)}
              locale={this.state.locale}
              minimumDate={toDateTime ?? reservationToDate}
              initialValue={toDateTime}
              defaultValue={reservationToDate}
              maximumDate={reservationToDate}
            />
          </View>
          {/* <View style={style.dateFiltersContainer}>
            <DateFilterControlComponent
              filterID={'expiryDateTime'}
              style={style.dateFilterComponentContainer}
              internalFilterID={GlobalFilters.RESERVATIONS_EXPIRY_DATE_FILTER}
              label={I18n.t('reservations.expiryDate')}
              onFilterChanged={(id: string, newExpiryDateTime: Date) => this.onFiltersChanged(null, { expiryDate: newExpiryDateTime })}
              ref={(dateFilterControlComponent: DateFilterControlComponent) => this.addModalFilter(dateFilterControlComponent)}
              locale={this.state.locale}
              minimumDate={reservationExpiryDate}
              initialValue={expiryDateTime}
              defaultValue={expiryDateTime}
            />
          </View> */}
        </FilterModalContainerComponent>
      </View>
    );
  }
}
